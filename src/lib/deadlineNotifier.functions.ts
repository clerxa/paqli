import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Notifications relatives aux dates limites de décision sur les liens
 * candidats. Déclenché par pg_cron via /api/public/hooks/deadline-notifier.
 *
 * Envoi d'email réel non branché ici : on logge et on met à jour les
 * drapeaux de notification. Brancher Lovable Emails / Resend plus tard.
 */
export const runDeadlineNotifier = createServerFn({ method: "POST" }).handler(
  async () => {
    const now = new Date();

    const { data: links, error } = await supabaseAdmin
      .from("candidate_links")
      .select(
        `id, token, status, decision_deadline,
         candidate_email, candidate_name,
         deadline_notified_48h, deadline_notified_24h, deadline_notified_expired,
         packages ( title )`,
      )
      .eq("status", "pending")
      .not("decision_deadline", "is", null);

    if (error) throw new Error(error.message);
    if (!links?.length) return { processed: 0 };

    let processed = 0;

    for (const link of links) {
      const deadline = new Date(link.decision_deadline as string);
      const hoursLeft = (deadline.getTime() - now.getTime()) / 3_600_000;
      const pkgTitle =
        (link.packages as { title?: string } | null)?.title ?? "ce poste";
      const candName = link.candidate_name ?? "Candidat";

      let flagToSet:
        | "deadline_notified_48h"
        | "deadline_notified_24h"
        | "deadline_notified_expired"
        | null = null;
      let label = "";

      if (
        !link.deadline_notified_expired &&
        hoursLeft <= 0
      ) {
        flagToSet = "deadline_notified_expired";
        label = "expired";
      } else if (
        !link.deadline_notified_24h &&
        hoursLeft > 0 &&
        hoursLeft <= 24
      ) {
        flagToSet = "deadline_notified_24h";
        label = "24h";
      } else if (
        !link.deadline_notified_48h &&
        hoursLeft > 0 &&
        hoursLeft <= 48
      ) {
        flagToSet = "deadline_notified_48h";
        label = "48h";
      }

      if (!flagToSet) continue;

      // TODO: envoyer un vrai email via Lovable Emails / Resend
      console.log(
        `[deadline TODO email] ${label} link=${link.id} candidate=${candName} email=${link.candidate_email ?? "?"} pkg="${pkgTitle}"`,
      );

      const update: {
        deadline_notified_48h?: boolean;
        deadline_notified_24h?: boolean;
        deadline_notified_expired?: boolean;
      } = { [flagToSet]: true };

      const { error: updErr } = await supabaseAdmin
        .from("candidate_links")
        .update(update)
        .eq("id", link.id);
      if (updErr) {
        console.error("deadline-notifier update failed", updErr);
        continue;
      }
      processed++;
    }

    return { processed };
  },
);
