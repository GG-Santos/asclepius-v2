"use server";

import { revalidatePath } from "next/cache";
import { displayName } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export type PortalActionState = { ok?: boolean; error?: string };

/**
 * A graduate submits or edits THEIR testimonial (R9: one per graduate —
 * enforced app-level on submittedByLcn; admin-curated rows with a null LCN
 * are exempt). Both create and edit land UNAPPROVED (R10): an edit pulls the
 * testimonial off the public page until an admin re-approves it. Admin
 * deletion frees the slot.
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

  const existing = await prisma.testimonial.findFirst({
    where: { submittedByLcn: graduate.lcn },
  });

  if (existing) {
    // Replaces an admin placeholder too: the graduate's own words take over
    // (their registry name, placeholder flag cleared) and go through review.
    await prisma.testimonial.update({
      where: { id: existing.id },
      data: {
        quote,
        rating,
        approved: false,
        placeholder: false,
        name: displayName(graduate),
        batchCode: graduate.batchCode,
      },
    });
  } else {
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
  }
  revalidatePath("/portal");
  revalidatePath("/");
  revalidatePath("/dashboard/testimonials");
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
