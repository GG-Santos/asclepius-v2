"use server";

import { revalidatePath } from "next/cache";
import { validateExpiryPolicy } from "@/lib/expiry-policy";
import { orgSettingsWhere } from "@/lib/org-settings";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/session";

export type ExpiryPolicyActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Save the org expiry policy. Writes ONLY the org-settings singleton —
 * existing graduate records are never touched (policy is future-only).
 */
export async function saveExpiryPolicy(
  _prev: ExpiryPolicyActionState,
  formData: FormData,
): Promise<ExpiryPolicyActionState> {
  try {
    await requireAdminAction();
  } catch {
    return { error: "Admin only." };
  }

  const candidate = {
    licenseValidityYears: Number(formData.get("licenseValidityYears")),
    archiveGraceYears: Number(formData.get("archiveGraceYears")),
  };
  const fieldErrors = validateExpiryPolicy(candidate);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  await prisma.orgSettings.upsert({
    where: orgSettingsWhere(),
    create: { key: "org", ...candidate },
    update: candidate,
  });

  revalidatePath("/dashboard/settings/expiry");
  revalidatePath("/dashboard/graduates");
  return { ok: true };
}
