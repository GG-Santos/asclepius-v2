// Pure expiry-policy domain: types, bounds, defaults, validation. Safe to
// import from server, client, and scripts. DB-backed readers live in
// org-settings.ts (server-only).

export interface ExpiryPolicy {
  /** Years a license stays valid (default 1; bounds 1–10). */
  licenseValidityYears: number;
  /** Years past expiry before auto-archive (default 2; bounds 0–10). */
  archiveGraceYears: number;
}

export const EXPIRY_POLICY_BOUNDS = {
  licenseValidityYears: { min: 1, max: 10 },
  archiveGraceYears: { min: 0, max: 10 },
} as const;

export const DEFAULT_EXPIRY_POLICY: ExpiryPolicy = {
  licenseValidityYears: 1,
  archiveGraceYears: 2,
};

/** Validate candidate policy values. Returns field errors, empty when valid. */
export function validateExpiryPolicy(
  candidate: Partial<ExpiryPolicy>,
): Partial<Record<keyof ExpiryPolicy, string>> {
  const errors: Partial<Record<keyof ExpiryPolicy, string>> = {};
  for (const field of ["licenseValidityYears", "archiveGraceYears"] as const) {
    const value = candidate[field];
    const { min, max } = EXPIRY_POLICY_BOUNDS[field];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < min ||
      value > max
    ) {
      errors[field] = `Must be a whole number between ${min} and ${max}.`;
    }
  }
  return errors;
}
