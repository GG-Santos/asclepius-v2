"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type TestimonialActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Admin adds a testimonial — either standalone, or ON BEHALF of a graduate
 * (placeholder). A placeholder publishes immediately and is REPLACED (sent
 * back through review) the moment that graduate submits their own from the
 * portal.
 */
export async function createAdminTestimonial(
  _prev: TestimonialActionState,
  formData: FormData,
): Promise<TestimonialActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const batchCode = String(formData.get("batchCode") ?? "").trim() || null;
  const quote = String(formData.get("quote") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 5);
  const lcn = String(formData.get("lcn") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Name is required.";
  if (quote.length < 10) fieldErrors.quote = "At least a sentence (10+ chars).";
  if (quote.length > 600) fieldErrors.quote = "Keep it under 600 characters.";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    fieldErrors.rating = "Pick 1–5 stars.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  if (lcn) {
    const graduate = await prisma.graduate.findUnique({ where: { lcn } });
    if (!graduate) return { fieldErrors: { lcn: "No graduate has this LCN." } };
    const existing = await prisma.testimonial.findFirst({
      where: { submittedByLcn: lcn },
    });
    if (existing) {
      return {
        fieldErrors: {
          lcn: "This graduate already has a testimonial (one per graduate).",
        },
      };
    }
  }

  await prisma.testimonial.create({
    data: {
      name,
      batchCode,
      quote,
      rating,
      approved: true, // admin-entered — publishes immediately
      submittedByLcn: lcn || null,
      placeholder: Boolean(lcn),
    },
  });
  revalidatePath("/dashboard/testimonials");
  revalidatePath("/");
  return { ok: true };
}

export async function setTestimonialApproved(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const approved = String(formData.get("approved") ?? "") === "true";
  if (!id) return;
  await prisma.testimonial.update({ where: { id }, data: { approved } });
  revalidatePath("/dashboard/testimonials");
  revalidatePath("/");
}

/** Pin/unpin a testimonial — pinned ones render first on the homepage. */
export async function setTestimonialPinned(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const pinned = String(formData.get("pinned") ?? "") === "true";
  if (!id) return;
  // Pinning a testimonial also publishes it (a pinned-but-hidden item is moot).
  await prisma.testimonial.update({
    where: { id },
    data: { pinned, ...(pinned ? { approved: true } : {}) },
  });
  revalidatePath("/dashboard/testimonials");
  revalidatePath("/");
}

export async function deleteTestimonial(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/dashboard/testimonials");
  revalidatePath("/");
}
