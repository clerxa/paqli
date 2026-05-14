import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ReminderType =
  | "not_opened_48h"
  | "opened_not_sim"
  | "sim_no_response"
  | "rh_suggestion";

/**
 * Moteur de relances. Appelé par /api/public/hooks/run-reminders
 * (déclenché par pg_cron toutes les heures).
 *
 * Pas d'envoi d'email réel — on logge dans la table `reminders`
 * et on incrémente le compteur côté `candidate_links`.
 * TODO: brancher un fournisseur d'email (Resend / Lovable Emails).
 */
export const runReminders = createServerFn({ method: "POST" }).handler(
  async () => {
    const now = new Date();

    const { data: links, error } = await supabaseAdmin
      .from("candidate_links")
      .select(
        "id, status, reminders_enabled, reminder_count, last_reminder_at, opened_at, simulated_at, candidate_email, candidate_name, created_at",
      )
      .eq("status", "pending")
      .eq("reminders_enabled", true)
      .lt("reminder_count", 2);

    if (error) throw new Error(error.message);
    if (!links?.length) return { processed: 0, candidate: 0, rh: 0 };

    let candidate = 0;
    let rh = 0;
    const inserts: Array<{ link_id: string; type: ReminderType; email_sent: boolean }> = [];
    const updates: Array<{ id: string; reminder_count: number }> = [];

    for (const link of links) {
      const created = new Date(link.created_at).getTime();
      const opened = link.opened_at ? new Date(link.opened_at).getTime() : null;
      const sim = link.simulated_at ? new Date(link.simulated_at).getTime() : null;
      const last = link.last_reminder_at
        ? new Date(link.last_reminder_at).getTime()
        : null;

      if (last && (now.getTime() - last) / 3600000 < 24) continue;

      const hCreated = (now.getTime() - created) / 3600000;
      const hOpened = opened ? (now.getTime() - opened) / 3600000 : null;
      const hSim = sim ? (now.getTime() - sim) / 3600000 : null;

      let type: ReminderType | null = null;
      if (!opened && hCreated >= 48) type = "not_opened_48h";
      else if (opened && !sim && hOpened! >= 24) type = "opened_not_sim";
      else if (sim && hSim! >= 48) type = "sim_no_response";

      if (!type) continue;

      const isCandidate = type === "not_opened_48h" || type === "opened_not_sim";
      const wantsEmail = isCandidate && !!link.candidate_email;

      // TODO: send real email here when provider is configured.
      // For now we only log.
      inserts.push({
        link_id: link.id,
        type: isCandidate ? type : "rh_suggestion",
        email_sent: false,
      });
      updates.push({ id: link.id, reminder_count: link.reminder_count + 1 });

      if (isCandidate) candidate++;
      else rh++;

      if (wantsEmail) {
        console.log(
          `[reminder TODO email] candidat=${link.candidate_email} type=${type} link=${link.id}`,
        );
      } else if (!isCandidate) {
        console.log(
          `[reminder TODO email] rh-alert link=${link.id} candidat=${link.candidate_name ?? "?"}`,
        );
      }
    }

    if (inserts.length) {
      await supabaseAdmin.from("reminders").insert(inserts);
      const nowIso = now.toISOString();
      // Updates en parallèle (peu de lignes attendues par run)
      await Promise.all(
        updates.map((u) =>
          supabaseAdmin
            .from("candidate_links")
            .update({ last_reminder_at: nowIso, reminder_count: u.reminder_count })
            .eq("id", u.id),
        ),
      );
    }

    return { processed: inserts.length, candidate, rh };
  },
);
