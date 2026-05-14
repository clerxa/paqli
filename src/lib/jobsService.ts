import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type {
  ContractType,
  GrowthPath,
  ManagerStyle,
  PackageConfig,
  ProcessStep,
  RemotePolicy,
} from "./packageConfig";

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export interface JobInput {
  title: string;
  status?: "active" | "draft" | "archived";
  jobSummary: string;
  missions: string[];
  stack: string[];
  contractType: ContractType;
  remotePolicy: RemotePolicy;
  remoteDays: number | null;
  remoteGuaranteed: boolean;
  flexibleHours: boolean;
  locationCity: string;
  locationDetails: string;
  teamSize: number | null;
  teamDescription: string;
  managerStyle: ManagerStyle | null;
  companyValues: string[];
  cultureNote: string;
  glassdoorUrl: string;
  wtjUrl: string;
  growthPaths: GrowthPath[];
  trainingBudget: number | null;
  onboardingNote: string;
  processSteps: ProcessStep[];
  processDuration: string;
  startDate: string;
}

export const emptyJob: JobInput = {
  title: "",
  status: "active",
  jobSummary: "",
  missions: [],
  stack: [],
  contractType: "cdi",
  remotePolicy: "hybrid",
  remoteDays: 2,
  remoteGuaranteed: false,
  flexibleHours: false,
  locationCity: "",
  locationDetails: "",
  teamSize: null,
  teamDescription: "",
  managerStyle: null,
  companyValues: [],
  cultureNote: "",
  glassdoorUrl: "",
  wtjUrl: "",
  growthPaths: [],
  trainingBudget: null,
  onboardingNote: "",
  processSteps: [],
  processDuration: "",
  startDate: "",
};

function toRow(input: JobInput, orgId: string, userId: string) {
  return {
    organization_id: orgId,
    created_by: userId,
    title: input.title || "Nouvelle offre",
    status: input.status ?? "active",
    job_summary: input.jobSummary || null,
    missions: (input.missions ?? []) as unknown as Json,
    stack: input.stack && input.stack.length > 0 ? input.stack : null,
    contract_type: input.contractType,
    remote_policy: input.remotePolicy,
    remote_days: input.remoteDays ?? null,
    remote_guaranteed: input.remoteGuaranteed,
    flexible_hours: input.flexibleHours,
    location_city: input.locationCity || null,
    location_details: input.locationDetails || null,
    team_size: input.teamSize ?? null,
    team_description: input.teamDescription || null,
    manager_style: input.managerStyle ?? null,
    company_values:
      input.companyValues && input.companyValues.length > 0
        ? input.companyValues
        : null,
    culture_note: input.cultureNote || null,
    glassdoor_url: input.glassdoorUrl || null,
    wtj_url: input.wtjUrl || null,
    growth_paths: (input.growthPaths ?? []) as unknown as Json,
    training_budget: input.trainingBudget ?? null,
    onboarding_note: input.onboardingNote || null,
    process_steps: (input.processSteps ?? []) as unknown as Json,
    process_duration: input.processDuration || null,
    start_date: input.startDate || null,
  };
}

export function rowToJobInput(row: JobRow): JobInput {
  const missions = Array.isArray(row.missions)
    ? (row.missions as unknown[]).filter((m): m is string => typeof m === "string")
    : [];
  const growth = Array.isArray(row.growth_paths)
    ? (row.growth_paths as unknown[]).filter(
        (g): g is GrowthPath =>
          typeof g === "object" && g !== null && "horizon" in g && "path" in g,
      )
    : [];
  const steps = Array.isArray(row.process_steps)
    ? (row.process_steps as unknown[]).filter(
        (s): s is ProcessStep =>
          typeof s === "object" && s !== null && "step" in s && "duration" in s,
      )
    : [];
  return {
    title: row.title,
    status: (row.status as JobInput["status"]) ?? "active",
    jobSummary: row.job_summary ?? "",
    missions,
    stack: row.stack ?? [],
    contractType: ((row.contract_type as ContractType) ?? "cdi") as ContractType,
    remotePolicy: ((row.remote_policy as RemotePolicy) ?? "hybrid") as RemotePolicy,
    remoteDays: row.remote_days ?? null,
    remoteGuaranteed: !!row.remote_guaranteed,
    flexibleHours: !!row.flexible_hours,
    locationCity: row.location_city ?? "",
    locationDetails: row.location_details ?? "",
    teamSize: row.team_size ?? null,
    teamDescription: row.team_description ?? "",
    managerStyle: (row.manager_style as ManagerStyle | null) ?? null,
    companyValues: row.company_values ?? [],
    cultureNote: row.culture_note ?? "",
    glassdoorUrl: row.glassdoor_url ?? "",
    wtjUrl: row.wtj_url ?? "",
    growthPaths: growth,
    trainingBudget: row.training_budget ?? null,
    onboardingNote: row.onboarding_note ?? "",
    processSteps: steps,
    processDuration: row.process_duration ?? "",
    startDate: row.start_date ?? "",
  };
}

export async function listJobs(orgId: string): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getJob(id: string): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createJob(
  input: JobInput,
  orgId: string,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("jobs")
    .insert(toRow(input, orgId, userId))
    .select("id")
    .single();
  if (error) throw error;
  return data!.id;
}

export async function updateJob(
  id: string,
  input: JobInput,
  orgId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update(toRow(input, orgId, userId))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Copies a job's fields into a PackageConfig (used when creating a new package
 * from an existing job). Does not link them — pure copy.
 */
export function applyJobToConfig(
  config: PackageConfig,
  job: JobRow,
): PackageConfig {
  const j = rowToJobInput(job);
  return {
    ...config,
    title: j.title || config.title,
    jobSummary: j.jobSummary,
    missions: j.missions,
    stack: j.stack,
    contractType: j.contractType,
    remotePolicy: j.remotePolicy,
    remoteDays: j.remoteDays,
    remoteGuaranteed: j.remoteGuaranteed,
    flexibleHours: j.flexibleHours,
    locationCity: j.locationCity,
    locationDetails: j.locationDetails,
    teamSize: j.teamSize,
    teamDescription: j.teamDescription,
    managerStyle: j.managerStyle,
    companyValues: j.companyValues,
    cultureNote: j.cultureNote,
    glassdoorUrl: j.glassdoorUrl,
    wtjUrl: j.wtjUrl,
    growthPaths: j.growthPaths,
    trainingBudget: j.trainingBudget,
    onboardingNote: j.onboardingNote,
    processSteps: j.processSteps,
    processDuration: j.processDuration,
    startDate: j.startDate,
    isDirty: true,
  };
}
