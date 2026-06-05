"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export type PortalActionState = { ok?: boolean; error?: string };

/** A graduate updates their own portrait (links a MediaAsset they uploaded). */
export async function updateMyPhoto(
  assetId: string,
): Promise<PortalActionState> {
  const { graduate } = await requireGraduate();
  const id = assetId.trim();
  if (!id) return { error: "No image." };

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return { error: "Image not found." };

  await prisma.graduate.update({
    where: { lcn: graduate.lcn },
    data: { photoId: asset.id },
  });
  revalidatePath("/portal");
  return { ok: true };
}
