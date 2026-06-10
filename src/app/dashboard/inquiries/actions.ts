"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type InquiryActionState = { ok?: boolean; error?: string };

const STATUSES = ["NEW", "CONTACTED", "CLOSED"] as const;

export async function setInquiryStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) return;
  await prisma.inquiry.update({
    where: { id },
    data: { status: status as (typeof STATUSES)[number] },
  });
  revalidatePath("/dashboard/inquiries");
}

/** Marks an inquiry as replied + moves it to CONTACTED (called when the admin
 * opens the prefilled reply email). */
export async function markInquiryReplied(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.inquiry.update({
    where: { id },
    data: { repliedAt: new Date(), status: "CONTACTED" },
  });
  revalidatePath("/dashboard/inquiries");
}

export async function updateInquiryNotes(
  formData: FormData,
): Promise<InquiryActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing inquiry." };
  const notes = String(formData.get("notes") ?? "").trim() || null;
  await prisma.inquiry.update({ where: { id }, data: { notes } });
  revalidatePath(`/dashboard/inquiries/${id}`);
  revalidatePath("/dashboard/inquiries");
  return { ok: true };
}

export async function deleteInquiry(
  formData: FormData,
): Promise<InquiryActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing inquiry." };
  await prisma.inquiry.delete({ where: { id } });
  revalidatePath("/dashboard/inquiries");
  return { ok: true };
}
