import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildOfferLetterDocument,
  type OfferLetterSnapshot,
} from "./offerLetterPdf.server";

const GenerateInput = z.object({
  linkId: z.string().uuid(),
});

export const generateOfferLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Charger les données — via le client utilisateur (RLS scope l'org)
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
      .eq("id", data.linkId)
      .maybeSingle();

    if (error || !link || !link.packages) {
      throw new Error("Lien introuvable");
    }

    if (link.status !== "accepted") {
      throw new Error(
        "La promesse d'embauche ne peut être générée que pour une offre acceptée",
      );
    }

    const org = link.organizations as {
      id: string;
      name: string;
      siret: string | null;
      address_street: string | null;
      address_zip: string | null;
      address_city: string | null;
    } | null;

    if (
      !org ||
      !org.siret ||
      !org.address_street ||
      !org.address_city
    ) {
      return {
        success: false as const,
        error: "incomplete_org" as const,
        message:
          "Veuillez renseigner le SIRET et l'adresse de l'entreprise dans les paramètres avant de générer la promesse d'embauche.",
        missingFields: [
          !org?.siret && "SIRET",
          !org?.address_street && "Adresse",
          !org?.address_city && "Ville",
        ].filter(Boolean) as string[],
      };
    }

    // 2. RH signataire
    const { data: rhProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    // 3. Snapshot
    const pkg = link.packages as {
      id: string;
      title: string;
      contract_type: string | null;
      gross_salary: number | null;
      variable_target: number | null;
      location_city: string | null;
      location_details: string | null;
      remote_policy: string | null;
      remote_days: number | null;
      remote_guaranteed: boolean | null;
      start_date: string | null;
      trial_period_months: number | null;
      trial_period_renewable: boolean | null;
    };

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
    };

    // 4. Generate document
    const doc = buildOfferLetterDocument(snapshot);

    // 5. Upload — utilise le client admin (les politiques storage exigent
    // authenticated, et le client utilisateur fonctionne aussi, mais admin
    // garantit l'écriture dans tous les contextes)
    const pdfPath = `${org.id}/${link.id}-${Date.now()}.${doc.extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("offer-letters")
      .upload(pdfPath, doc.bytes, {
        contentType: doc.contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erreur upload : ${uploadError.message}`);
    }

    // 6. Insert record
    const { data: letter, error: insertError } = await supabase
      .from("offer_letters")
      .insert({
        link_id: link.id,
        organization_id: org.id,
        package_id: pkg.id,
        created_by: userId,
        snapshot: snapshot as unknown as Record<string, unknown>,
        status: "draft",
        pdf_path: pdfPath,
      })
      .select("id")
      .single();

    if (insertError || !letter) {
      throw new Error(insertError?.message ?? "Erreur création promesse");
    }

    // 7. Signed URL preview (24h)
    const { data: signed } = await supabaseAdmin.storage
      .from("offer-letters")
      .createSignedUrl(pdfPath, 24 * 3600);

    return {
      success: true as const,
      letterId: letter.id,
      previewUrl: signed?.signedUrl ?? null,
    };
  });

const SendInput = z.object({
  letterId: z.string().uuid(),
});

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

    // TODO Risque 3 — branchement Resend
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
      metadata: { letterId: letter.id } as unknown as Record<string, unknown>,
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

    return {
      complete: missing.length === 0,
      missing,
    };
  });
