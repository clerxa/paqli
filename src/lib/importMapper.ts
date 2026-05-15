import type { ImportedJobData } from "./importJob.functions";
import type { JobInput } from "./jobsService";
import { emptyJob } from "./jobsService";
import type { PackageConfig } from "./packageConfig";

export function mapToJobInput(data: ImportedJobData): JobInput {
  return {
    ...emptyJob,
    title: data.title ?? "",
    jobSummary: data.job_summary ?? "",
    missions: data.missions ?? [],
    stack: data.stack ?? [],
    contractType: data.contract_type ?? "cdi",
    remotePolicy: data.remote_policy ?? "hybrid",
    remoteDays: data.remote_days ?? emptyJob.remoteDays,
    flexibleHours: data.flexible_hours ?? false,
    locationCity: data.location_city ?? "",
    locationDetails: data.location_details ?? "",
    teamSize: data.team_size ?? null,
    teamDescription: data.team_description ?? "",
    managerStyle: data.manager_style ?? null,
    companyValues: data.company_values ?? [],
    cultureNote: data.culture_note ?? "",
    growthPaths: data.growth_paths ?? [],
    trainingBudget: data.training_budget ?? null,
    onboardingNote: data.onboarding_note ?? "",
    processSteps: (data.process_steps ?? []).map((p) => ({
      step: p.step,
      duration: p.duration ?? "",
    })),
    processDuration: data.process_duration ?? "",
    startDate: data.start_date ?? "",
  };
}

export function mapToPackageConfig(
  data: ImportedJobData,
): Partial<PackageConfig> {
  let grossSalary: number | undefined;
  if (data.gross_salary_min && data.gross_salary_max) {
    grossSalary =
      Math.round((data.gross_salary_min + data.gross_salary_max) / 2 / 1000) *
      1000;
  } else if (data.gross_salary_min) {
    grossSalary = data.gross_salary_min;
  } else if (data.gross_salary_max) {
    grossSalary = data.gross_salary_max;
  }

  const out: Partial<PackageConfig> = {
    title: data.title ?? "",
    jobSummary: data.job_summary ?? "",
    missions: data.missions ?? [],
    stack: data.stack ?? [],
    contractType: data.contract_type ?? "cdi",
    remotePolicy: data.remote_policy ?? "hybrid",
    flexibleHours: data.flexible_hours ?? false,
    locationCity: data.location_city ?? "",
    locationDetails: data.location_details ?? "",
    teamSize: data.team_size ?? null,
    teamDescription: data.team_description ?? "",
    managerStyle: data.manager_style ?? null,
    companyValues: data.company_values ?? [],
    cultureNote: data.culture_note ?? "",
    growthPaths: data.growth_paths ?? [],
    trainingBudget: data.training_budget ?? null,
    onboardingNote: data.onboarding_note ?? "",
    processSteps: (data.process_steps ?? []).map((p) => ({
      step: p.step,
      duration: p.duration ?? "",
    })),
    processDuration: data.process_duration ?? "",
    startDate: data.start_date ?? "",
  };
  if (data.remote_days != null) out.remoteDays = data.remote_days;
  if (grossSalary != null) out.grossSalary = grossSalary;
  if (data.variable_target != null) out.variableTarget = data.variable_target;
  return out;
}
