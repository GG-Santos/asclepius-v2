"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { testimonialInputSchema } from "@/lib/validation";

export type TestimonialActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createTestimonial(
  _prev: TestimonialActionState,
  formData: FormData,
): Promise<TestimonialActionState> {
  await requireAdmin();
  const parsed = testimonialInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues)
      fe[i.path.map(String).join(".")] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }

  const { name, batchCode, quote, rating } = parsed.data;
  await prisma.testimonial.create({
    data: { name, batchCode, quote, rating },
  });
  revalidatePath("/dashboard/testimonials");
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

export async function deleteTestimonial(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/dashboard/testimonials");
  revalidatePath("/");
}
