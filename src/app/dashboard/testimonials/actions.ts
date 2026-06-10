"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type TestimonialActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

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
