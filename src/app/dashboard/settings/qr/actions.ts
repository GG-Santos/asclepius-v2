"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { orgSettingsWhere } from "@/lib/org-settings";
import { prisma } from "@/lib/prisma";
import {
  parseQrConfig,
  QR_CONFIG_DEFAULTS,
  type QrErrorCorrection,
} from "@/lib/qr-config";
import { requireAdminAction } from "@/lib/session";

const ECC: QrErrorCorrection[] = ["L", "M", "Q", "H"];

export async function saveQrSettings(formData: FormData) {
  await requireAdminAction();

  const candidate = parseQrConfig({
    size: Number(formData.get("size")),
    foreground: formData.get("foreground"),
    background: formData.get("background"),
    errorCorrectionLevel: ECC.includes(
      formData.get("errorCorrectionLevel") as QrErrorCorrection,
    )
      ? formData.get("errorCorrectionLevel")
      : QR_CONFIG_DEFAULTS.errorCorrectionLevel,
    logoUrl: formData.get("logoUrl"),
  } as Prisma.JsonValue);

  await prisma.orgSettings.upsert({
    where: orgSettingsWhere(),
    create: { key: "org", qrConfig: candidate },
    update: { qrConfig: candidate },
  });

  revalidatePath("/dashboard/settings/qr");
  revalidatePath("/dashboard/settings/templates");
  revalidatePath("/verify");
}

export async function resetQrSettings() {
  await requireAdminAction();

  await prisma.orgSettings.upsert({
    where: orgSettingsWhere(),
    create: { key: "org", qrConfig: QR_CONFIG_DEFAULTS },
    update: { qrConfig: QR_CONFIG_DEFAULTS },
  });

  revalidatePath("/dashboard/settings/qr");
  revalidatePath("/dashboard/settings/templates");
  revalidatePath("/verify");
}
