import "server-only";
import { createHash } from "node:crypto";
import type { MediaAsset } from "@prisma/client";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export type UploadResult = MediaAsset;

/**
 * Upload an image to Vercel Blob and record it in MongoDB.
 *
 * The file is content-addressed by the SHA-256 hash of its bytes, so the same
 * image is stored once (dedup) and the hash doubles as an integrity fingerprint
 * — exactly the "URL + content hash" model chosen for this project.
 */
export async function uploadImage(
  file: File,
  opts?: { folder?: string; uploadedBy?: string | null },
): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  // Dedup: if we already have this exact image, reuse it (no re-upload).
  const existing = await prisma.mediaAsset.findFirst({
    where: { contentHash },
  });
  if (existing) return existing;

  const folder = opts?.folder ?? "uploads";
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const pathname = `${folder}/${contentHash}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: file.type || undefined,
    addRandomSuffix: false, // pathname already unique by content hash
    allowOverwrite: true,
  });

  return prisma.mediaAsset.create({
    data: {
      url: blob.url,
      pathname: blob.pathname,
      contentHash,
      contentType: file.type || null,
      size: buffer.length,
      uploadedBy: opts?.uploadedBy ?? null,
    },
  });
}
