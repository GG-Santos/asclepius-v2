"use server";

import { revalidatePath } from "next/cache";
import { displayName } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export type PortalActionState = { ok?: boolean; error?: string };

/**
 * A graduate submits a testimonial from the portal. It is created UNAPPROVED —
 * an admin reviews and publishes it. One pending submission at a time keeps the
 * queue clean.
 */
export async function submitTestimonial(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const { graduate } = await requireGraduate();
  const quote = String(formData.get("quote") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 5);
  if (quote.length < 10)
    return { error: "Please write at least a sentence (10+ characters)." };
  if (quote.length > 600)
    return { error: "Please keep it under 600 characters." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { error: "Pick a rating from 1 to 5." };

  const pending = await prisma.testimonial.findFirst({
    where: { submittedByLcn: graduate.lcn, approved: false },
  });
  if (pending)
    return { error: "You already have a testimonial awaiting review." };

  await prisma.testimonial.create({
    data: {
      name: displayName(graduate),
      batchCode: graduate.batchCode,
      quote,
      rating,
      approved: false,
      submittedByLcn: graduate.lcn,
    },
  });
  revalidatePath("/portal");
  return { ok: true };
}

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
