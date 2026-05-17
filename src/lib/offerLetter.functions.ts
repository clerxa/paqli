import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildOfferLetterDocument,
  type OfferLetterSnapshot,
} from "./offerLetterPdf.server";

// ── Schéma des champs éditables par le RH avant envoi ────────────────────────
const EditsSchema = z
  .object({
    jobTitle: z.string().min(1).max(200).optional(),
    grossSalary: z.number().min(0).max(10_000_000).optional(),
    variableTarget: z.number().min(0).max(10_000_000).nullable().optional(),
    startDate: z.string().max(100).nullable().optional(),
    trialPeriodMonths: z.number().int().min(0).max(24).nullable().optional(),
    trialPeriodRenewable: z.boolean().optional(),
    locationCity: z.string().max(120).optional(),
    locationDetails: z.string().max(300).nullable().optional(),
    remotePolicy: z
      .enum(["full_remote", "hybrid", "office_first", "on_site"])
      .nullable()
      .optional(),
    remoteDays: z.number().int().min(0).max(5).nullable().optional(),
    remoteGuaranteed: z.boolean().optional(),
    additionalClauses: z.string().max(5000).nullable().optional(),
    rhName: z.string().max(120).optional(),
  })
  .strict();

export type OfferLetterEdits = z.infer<typeof EditsSchema>;

const GenerateInput = z.object({
  linkId: z.string().uuid(),
  edits: EditsSchema.optional().default({}),
});

async function buildSnapshotFromLink(
  supabase: any,
  userId: string,
  linkId: string,
): Promise<
  | { ok: true; snapshot: OfferLetterSnapshot; orgId: string; packageId: string; linkRow: any }
  | { ok: false; error: "not_found" | "not_accepted" | "incomplete_org"; missing?: string[] }
> {
  const { data: link, error } = await supabase
    .from("candidate_links")
    .select(
      `id, status, candidate_name, candidate_email, organization_id, package_id,
       packages (
         id, title, contract_type, gross_salary, variable_target,
         location_city, location_details,
         remote_policy, remote_days, remote_guaranteed,
         start_date, trial_period_months, trial_period_renewable
       ),
       organizations:organization_id (
         id, name, siret, address_street, address_zip, address_city
       )`,
    )
    .eq("id", linkId)
    .maybeSingle();

  if (error || !link || !link.packages) return { ok: false, error: "not_found" };
  if (link.status !== "accepted") return { ok: false, error: "not_accepted" };

  const org = link.organizations;
  if (!org || !org.siret || !org.address_street || !org.address_city) {
    return {
      ok: false,
      error: "incomplete_org",
      missing: [
        !org?.siret && "SIRET",
        !org?.address_street && "Adresse",
        !org?.address_city && "Ville",
      ].filter(Boolean) as string[],
    };
  }

  const { data: rhProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const pkg = link.packages;
  const snapshot: OfferLetterSnapshot = {
    candidateName: link.candidate_name ?? "",
    candidateEmail: link.candidate_email ?? "",
    orgName: org.name,
    orgSiret: org.siret,
    orgAddress: `${org.address_street}, ${org.address_zip ?? ""} ${org.address_city}`.trim(),
    jobTitle: pkg.title,
    contractType: pkg.contract_type ?? "cdi",
    locationCity: pkg.location_city ?? "",
    locationDetails: pkg.location_details,
    grossSalary: Number(pkg.gross_salary) || 0,
    variableTarget: pkg.variable_target ? Number(pkg.variable_target) : null,
    startDate: pkg.start_date,
    trialPeriodMonths: pkg.trial_period_months,
    trialPeriodRenewable: !!pkg.trial_period_renewable,
    remotePolicy: pkg.remote_policy,
    remoteDays: pkg.remote_days,
    remoteGuaranteed: !!pkg.remote_guaranteed,
    rhName: rhProfile?.full_name ?? "",
    rhEmail: rhProfile?.email ?? "",
    generatedAt: new Date().toISOString(),
    additionalClauses: null,
  };

  return { ok: true, snapshot, orgId: org.id, packageId: pkg.id, linkRow: link };
}

function mergeEdits(base: OfferLetterSnapshot, edits: OfferLetterEdits): OfferLetterSnapshot {
  return {
    ...base,
    ...(edits.jobTitle !== undefined && { jobTitle: edits.jobTitle }),
    ...(edits.grossSalary !== undefined && { grossSalary: edits.grossSalary }),
    ...(edits.variableTarget !== undefined && { variableTarget: edits.variableTarget }),
    ...(edits.startDate !== undefined && { startDate: edits.startDate }),
    ...(edits.trialPeriodMonths !== undefined && { trialPeriodMonths: edits.trialPeriodMonths }),
    ...(edits.trialPeriodRenewable !== undefined && {
      trialPeriodRenewable: edits.trialPeriodRenewable,
    }),
    ...(edits.locationCity !== undefined && { locationCity: edits.locationCity }),
    ...(edits.locationDetails !== undefined && { locationDetails: edits.locationDetails }),
    ...(edits.remotePolicy !== undefined && { remotePolicy: edits.remotePolicy }),
    ...(edits.remoteDays !== undefined && { remoteDays: edits.remoteDays }),
    ...(edits.remoteGuaranteed !== undefined && { remoteGuaranteed: edits.remoteGuaranteed }),
    ...(edits.additionalClauses !== undefined && { additionalClauses: edits.additionalClauses }),
    ...(edits.rhName !== undefined && { rhName: edits.rhName }),
  };
}

// ── Pré-charge le brouillon courant + valeurs initiales pour le formulaire ──
export const getOfferLetterDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ linkId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const built = await buildSnapshotFromLink(supabase, userId, data.linkId);
    if (!built.ok) {
      return { ok: false as const, error: built.error, missing: built.missing ?? [] };
    }
    const { data: existing } = await supabase
      .from("offer_letters")
      .select("id, status, edits, pdf_path")
      .eq("link_id", data.linkId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let previewUrl: string | null = null;
    if (existing?.status === "draft" && existing.pdf_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("offer-letters")
        .createSignedUrl(existing.pdf_path, 24 * 3600);
      previewUrl = signed?.signedUrl ?? null;
    }

    return {
      ok: true as const,
      defaults: {
        jobTitle: built.snapshot.jobTitle,
        grossSalary: built.snapshot.grossSalary,
        variableTarget: built.snapshot.variableTarget,
        startDate: built.snapshot.startDate,
        trialPeriodMonths: built.snapshot.trialPeriodMonths,
        trialPeriodRenewable: built.snapshot.trialPeriodRenewable,
        locationCity: built.snapshot.locationCity,
        locationDetails: built.snapshot.locationDetails,
        remotePolicy: built.snapshot.remotePolicy,
        remoteDays: built.snapshot.remoteDays,
        remoteGuaranteed: built.snapshot.remoteGuaranteed,
        additionalClauses: built.snapshot.additionalClauses ?? "",
        rhName: built.snapshot.rhName,
      },
      existing: existing
        ? { id: existing.id, status: existing.status, edits: existing.edits, previewUrl }
        : null,
    };
  });

export const generateOfferLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const built = await buildSnapshotFromLink(supabase, userId, data.linkId);
    if (!built.ok) {
      if (built.error === "not_accepted") {
        throw new Error(
          "La promesse d'embauche ne peut être générée que pour une offre acceptée",
        );
      }
      if (built.error === "incomplete_org") {
        return {
          success: false as const,
          error: "incomplete_org" as const,
          message:
            "Veuillez renseigner le SIRET et l'adresse de l'entreprise dans les paramètres avant de générer la promesse d'embauche.",
          missingFields: built.missing ?? [],
        };
      }
      throw new Error("Lien introuvable");
    }

    const snapshot = mergeEdits(built.snapshot, data.edits);
    const doc = await buildOfferLetterDocument(snapshot);

    // Si un brouillon existe déjà pour ce lien, on le met à jour ; sinon on crée.
    const { data: existing } = await supabase
      .from("offer_letters")
      .select("id, status, pdf_path")
      .eq("link_id", data.linkId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.status === "sent") {
      return {
        success: false as const,
        error: "already_sent" as const,
        message: "Cette promesse a déjà été envoyée et ne peut plus être modifiée.",
        missingFields: [],
      };
    }

    const pdfPath = `${built.orgId}/${built.linkRow.id}-${Date.now()}.${doc.extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("offer-letters")
      .upload(pdfPath, doc.bytes, {
        contentType: doc.contentType,
        upsert: true,
      });
    if (uploadError) throw new Error(`Erreur upload : ${uploadError.message}`);

    let letterId: string;
    if (existing) {
      // Supprime l'ancien PDF du storage (best-effort)
      if (existing.pdf_path) {
        await supabaseAdmin.storage.from("offer-letters").remove([existing.pdf_path]);
      }
      const { error: updateError } = await supabase
        .from("offer_letters")
        .update({
          snapshot: snapshot as any,
          edits: data.edits as any,
          pdf_path: pdfPath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
      letterId = existing.id;
    } else {
      const { data: letter, error: insertError } = await supabase
        .from("offer_letters")
        .insert({
          link_id: built.linkRow.id,
          organization_id: built.orgId,
          package_id: built.packageId,
          created_by: userId,
          snapshot: snapshot as any,
          edits: data.edits as any,
          status: "draft",
          pdf_path: pdfPath,
        })
        .select("id")
        .single();
      if (insertError || !letter) throw new Error(insertError?.message ?? "Erreur création promesse");
      letterId = letter.id;
    }

    const { data: signed } = await supabaseAdmin.storage
      .from("offer-letters")
      .createSignedUrl(pdfPath, 24 * 3600);

    return {
      success: true as const,
      letterId,
      previewUrl: signed?.signedUrl ?? null,
    };
  });

const SendInput = z.object({ letterId: z.string().uuid() });

export const sendOfferLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: letter, error } = await supabase
      .from("offer_letters")
      .select("*")
      .eq("id", data.letterId)
      .maybeSingle();

    if (error || !letter) throw new Error("Promesse introuvable");
    if (letter.status === "sent") throw new Error("Déjà envoyée");

    const snap = letter.snapshot as unknown as OfferLetterSnapshot;

    const { data: signed } = await supabaseAdmin.storage
      .from("offer-letters")
      .createSignedUrl(letter.pdf_path!, 30 * 24 * 3600);

    // TODO — branchement Resend
    console.log(
      `[offerLetter TODO email] → ${snap.candidateEmail} url=${signed?.signedUrl ?? "n/a"}`,
    );

    await supabase
      .from("offer_letters")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", letter.id);

    await supabase.from("link_events").insert({
      link_id: letter.link_id,
      event_type: "offer_letter_sent",
      metadata: { letterId: letter.id } as any,
    });

    return { success: true as const };
  });

export const getOrgLegalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("organizations")
      .select("siret, address_street, address_zip, address_city")
      .limit(1)
      .maybeSingle();

    const missing = [
      !data?.siret && "SIRET",
      !data?.address_street && "Adresse",
      !data?.address_city && "Ville",
    ].filter(Boolean) as string[];

    return { complete: missing.length === 0, missing };
  });
