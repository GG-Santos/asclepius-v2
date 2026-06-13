"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { orgSettingsWhere } from "@/lib/org-settings";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/session";
import type { SignatureAsset } from "@/lib/signature-assets";
import { parseSignatureAssets } from "@/lib/signature-assets";

const SETTINGS_PATH = "/dashboard/settings/signatures";

function cleanText(value: FormDataEntryValue | null, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 120)
    : fallback;
}

function sanitizeSignatureSvg(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") return "";
  const input = raw.trim();
  if (!input || input.length > 150_000 || !input.startsWith("<svg")) return "";
  if (/<(?:script|foreignObject|image|a|style)\b/i.test(input)) return "";
  if (/\bon[a-z]+\s*=|\bhref\s*=|\bxlink:href\s*=/i.test(input)) return "";

  const viewBoxMatch = input.match(/viewBox="([^"]+)"/i);
  const viewBox = viewBoxMatch?.[1] ?? "0 0 640 220";
  if (
    !/^\s*-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?\s*$/.test(
      viewBox,
    )
  ) {
    return "";
  }

  const paths = [...input.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*>/gi)]
    .map((match) => match[1])
    .filter((d) => /^[MmLlHhVvCcSsQqTtAaZz0-9,.\s-]+$/.test(d))
    .slice(0, 80);

  if (paths.length === 0) return "";
  const body = paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.trim()}" color="#111827" role="img" aria-label="Signature">${body}</svg>`;
}

export async function saveSignatureAsset(formData: FormData) {
  await requireAdminAction();

  const svg = sanitizeSignatureSvg(formData.get("signatureSvg"));
  if (!svg) redirect(`${SETTINGS_PATH}?error=missing-signature`);

  const settings = await prisma.orgSettings.findUnique({
    where: orgSettingsWhere(),
    select: { signatureAssets: true },
  });
  const existing = parseSignatureAssets(settings?.signatureAssets);
  const asset: SignatureAsset = {
    id: randomUUID(),
    label: cleanText(formData.get("label"), "Signature"),
    role: cleanText(formData.get("role"), ""),
    svgDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString(
      "base64",
    )}`,
    createdAt: new Date().toISOString(),
  };

  await prisma.orgSettings.upsert({
    where: orgSettingsWhere(),
    create: { key: "org", signatureAssets: [asset] },
    update: { signatureAssets: [asset, ...existing].slice(0, 24) },
  });

  revalidatePath(SETTINGS_PATH);
  revalidatePath("/dashboard/settings/templates");
  redirect(`${SETTINGS_PATH}?saved=1`);
}

export async function deleteSignatureAsset(formData: FormData) {
  await requireAdminAction();
  const id = cleanText(formData.get("id"), "");
  const settings = await prisma.orgSettings.findUnique({
    where: orgSettingsWhere(),
    select: { signatureAssets: true },
  });
  const next = parseSignatureAssets(settings?.signatureAssets).filter(
    (asset) => asset.id !== id,
  );

  await prisma.orgSettings.upsert({
    where: orgSettingsWhere(),
    create: { key: "org", signatureAssets: next },
    update: { signatureAssets: next },
  });

  revalidatePath(SETTINGS_PATH);
  revalidatePath("/dashboard/settings/templates");
}
