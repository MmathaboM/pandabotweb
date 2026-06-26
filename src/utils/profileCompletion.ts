import {
  educationService,
  experienceService,
  skillsService,
} from "../services/cv";
import { documentsService } from "../services/document";
import { profileService } from "../services/profile";
export interface CompletionBreakdown {
  overall: number;
  personal: { percentage: number; missing: string[] };
  documents: {
    percentage: number;
    totalRequired: number;
    totalMissing: number;
  };
  cv: { percentage: number; completedSections: number };
  idVerification: { percentage: number; isVerified: boolean };
}

/**
 * Calculates weighted profile completion.
 * Weights: Personal 40%, Documents 35%, ID Verification 25%
 */
export async function calculateProfileCompletion(): Promise<CompletionBreakdown> {
  const [user, docCheck, edus, exps, skills] = await Promise.all([
    profileService.getProfile().catch(() => null),
    documentsService.checkDocuments().catch(() => ({
      hasUploadedAllDocuments: false,
      missingDocuments: [] as string[],
      requiredDocuments: [] as string[],
      completionPercentage: 0,
    })),
    educationService.list().catch(() => [] as any[]),
    experienceService.list().catch(() => [] as any[]),
    skillsService.list().catch(() => [] as any[]),
  ]);

  // ── Personal Info ─────────────────────────────────────────
  const u = user as any;
  const demo = u?.demographics ?? {};
  const pi = u?.personal_info ?? {};

  const fieldMap: Record<string, any> = {
    first_name: u?.first_name,
    last_name: u?.last_name,
    email: u?.email,
    mobile_number: u?.mobile_number,
    id_number: demo?.sa_id_number ?? u?.sa_id_number,
    DOB: demo?.date_of_birth ?? pi?.date_of_birth ?? u?.date_of_birth,
    gender: demo?.gender_id ?? pi?.gender_id ?? u?.gender_id,
    // race: demo?.equity_group ?? u?.equity_group,
  };

  const totalPersonal = Object.keys(fieldMap).length;
  const completedPersonal = Object.values(fieldMap).filter((v) => !!v).length;
  const personalPct =
    totalPersonal > 0
      ? Math.round((completedPersonal / totalPersonal) * 100)
      : 0;
  const missingFields = Object.entries(fieldMap)
    .filter(([, v]) => !v)
    .map(([k]) =>
      k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    );

  // ── Documents ─────────────────────────────────────────────
  const totalRequired = docCheck.requiredDocuments.length;
  const totalMissing = docCheck.missingDocuments.length;
  const docPct = totalRequired > 0 ? docCheck.completionPercentage : 100;

  // ── CV ────────────────────────────────────────────────────
  const cvParts = [
    (edus ?? []).length > 0,
    (exps ?? []).length > 0,
    (skills ?? []).length > 0,
  ];
  const completedSections = cvParts.filter(Boolean).length;
  const cvPct = Math.round((completedSections / 3) * 100);

  // ── ID Verification ───────────────────────────────────────
  const isIdVerified = u?.id_verification?.is_verified === true;
  const idVerificationPct = isIdVerified ? 100 : 0;

  // ── Weighted Overall ──────────────────────────────────────
  const overall = Math.round(
    personalPct * 0.4 + docPct * 0.35 + idVerificationPct * 0.25,
  );

  return {
    overall,
    personal: { percentage: personalPct, missing: missingFields },
    documents: { percentage: docPct, totalRequired, totalMissing },
    cv: { percentage: cvPct, completedSections },
    idVerification: { percentage: idVerificationPct, isVerified: isIdVerified },
  };
}
