"use server";

import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { parseTemplateConfig } from "@/lib/artifact-template/resolve";
import { validateTemplateConfig } from "@/lib/artifact-template/validate";
import { orgSettingsWhere } from "@/lib/org-settings";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/session";
import { sanitizeSvg, sniffTemplateAsset } from "@/lib/svg-sanitize";

// Sanitized template assets live under this folder; renders may reference
// ONLY these copies — never the raw client upload URL.
const TEMPLATE_ASSET_FOLDER = "template-assets";

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

export type TemplateActionState = {
  ok?: boolean;
  error?: string;
  /** attachTemplateAsset: the sanitized asset to reference in the draft. */
  url?: string;
  contentType?: "image/svg+xml" | "image/png";
};

/** True only for URLs produced by this module's sanitize pipeline. */
async function isSanitizedTemplateAssetUrl(url: string): Promise<boolean> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { url },
    select: { pathname: true },
  });
  return Boolean(asset?.pathname?.startsWith(`${TEMPLATE_ASSET_FOLDER}/`));
}

/**
 * R8: take a client-direct Blob upload, fetch its bytes server-side, validate
 * the REAL type by magic numbers, sanitize SVG markup, and persist the
 * sanitized copy. Returns the sanitized URL for the editor draft. Failures
 * leave the draft and saved template untouched (nothing is persisted).
 */
export async function attachTemplateAsset(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  try {
    await requireAdminAction();
  } catch {
    return { error: "Admin only." };
  }

  const uploadUrl = String(formData.get("uploadUrl") ?? "");
  let host: string;
  try {
    host = new URL(uploadUrl).hostname;
  } catch {
    return { error: "Invalid upload URL." };
  }
  if (!BLOB_HOST.test(host)) {
    return { error: "Upload URL is not from the asset store." };
  }

  let bytes: Uint8Array;
  try {
    const res = await fetch(uploadUrl);
    if (!res.ok) throw new Error(String(res.status));
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch {
    return { error: "Could not read the uploaded file. Try again." };
  }

  const kind = sniffTemplateAsset(bytes);
  if (!kind) {
    return { error: "Only SVG or PNG files can replace artwork layers." };
  }

  let outBytes: Uint8Array;
  if (kind === "image/svg+xml") {
    try {
      const clean = sanitizeSvg(new TextDecoder().decode(bytes));
      outBytes = new TextEncoder().encode(clean);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "SVG failed sanitization.",
      };
    }
  } else {
    outBytes = bytes; // PNG: raster, no script surface — stored as-is.
  }

  const buffer = Buffer.from(outBytes);
  const contentHash = createHash("sha256").update(buffer).digest("hex");
  const ext = kind === "image/png" ? "png" : "svg";
  const pathname = `${TEMPLATE_ASSET_FOLDER}/${contentHash}.${ext}`;

  const existing = await prisma.mediaAsset.findFirst({
    where: { contentHash, pathname },
  });
  if (existing) {
    return { ok: true, url: existing.url, contentType: kind };
  }

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: kind,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  await prisma.mediaAsset.create({
    data: {
      url: blob.url,
      pathname: blob.pathname,
      contentHash,
      contentType: kind,
      size: buffer.length,
    },
  });

  return { ok: true, url: blob.url, contentType: kind };
}

/**
 * R5: persist a new template version (append-only — history retained) and
 * point the org settings at it. Rejects configs referencing assets that did
 * not pass the sanitize pipeline.
 */
export async function saveArtifactTemplate(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  try {
    await requireAdminAction();
  } catch {
    return { error: "Admin only." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("config") ?? ""));
  } catch {
    return { error: "Malformed template payload." };
  }
  const config = parseTemplateConfig(raw);

  // Async URL whitelist resolved up-front so validation stays pure.
  const urls = Object.values(config.layerReplacements)
    .map((r) => r?.url)
    .filter((u): u is string => Boolean(u));
  const allowed = new Set<string>();
  for (const url of urls) {
    if (await isSanitizedTemplateAssetUrl(url)) allowed.add(url);
  }
  const errors = validateTemplateConfig(config, (url) => allowed.has(url));
  if (errors.length > 0) {
    return { error: errors.join(" ") };
  }

  await persistVersion(config, null);
  return { ok: true };
}

/**
 * R7: reset-to-default persists a NEW version whose payload equals the
 * built-in defaults — audit history is never destroyed.
 */
export async function resetArtifactTemplate(
  _prev: TemplateActionState,
  _formData: FormData,
): Promise<TemplateActionState> {
  try {
    await requireAdminAction();
  } catch {
    return { error: "Admin only." };
  }
  await persistVersion(
    {
      schemaVersion: 1,
      textOverrides: {},
      overlayColors: {},
      layerReplacements: {},
    },
    "reset to defaults",
  );
  return { ok: true };
}

async function persistVersion(
  config: ReturnType<typeof parseTemplateConfig>,
  note: string | null,
): Promise<void> {
  const latest = await prisma.artifactTemplateVersion.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const created = await prisma.artifactTemplateVersion.create({
    data: {
      version: (latest?.version ?? 0) + 1,
      config: JSON.parse(JSON.stringify(config)),
      note,
    },
  });
  await prisma.orgSettings.upsert({
    where: orgSettingsWhere(),
    create: { key: "org", activeTemplateVersionId: created.id },
    update: { activeTemplateVersionId: created.id },
  });
  revalidatePath("/dashboard/settings/templates");
  revalidatePath("/dashboard/graduates");
  revalidatePath("/portal");
}
