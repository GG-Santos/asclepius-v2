"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type BatchActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const batchSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .transform((c) => c.toUpperCase()),
  batchNumber: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().optional(),
  ),
  label: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().optional(),
  ),
  year: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1900).max(2200).optional(),
  ),
});

export async function createBatch(
  _prev: BatchActionState,
  formData: FormData,
): Promise<BatchActionState> {
  await requireAdmin();
  const parsed = batchSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const { code, batchNumber, label, year } = parsed.data;
  const exists = await prisma.batch.findUnique({ where: { code } });
  if (exists) return { error: `${code} already exists.` };

  const logoAssetId = String(formData.get("logoAssetId") ?? "").trim() || null;

  await prisma.batch.create({
    data: {
      code,
      batchNumber: batchNumber ?? null,
      label: label ?? null,
      year: year ?? null,
      ...(logoAssetId ? { logoId: logoAssetId } : {}),
    },
  });
  revalidatePath("/dashboard/batches");
  return { ok: true };
}

export async function updateBatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const batchNumber = String(formData.get("batchNumber") ?? "").trim() || null;
  const label = String(formData.get("label") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : null;
  const logoAssetId = String(formData.get("logoAssetId") ?? "").trim() || null;

  await prisma.batch.update({
    where: { id },
    data: {
      batchNumber,
      label: label || null,
      year: Number.isFinite(year) ? year : null,
      ...(logoAssetId ? { logoId: logoAssetId } : {}),
    },
  });
  revalidatePath("/dashboard/batches");
  revalidatePath(`/dashboard/batches/${id}`);
}

export async function deleteBatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) return;
  const inUse = await prisma.graduate.count({
    where: { OR: [{ batchId: id }, { batchCode: batch.code }] },
  });
  if (inUse > 0) return; // guarded: don't delete non-empty batches
  await prisma.batch.delete({ where: { id } });
  revalidatePath("/dashboard/batches");
}
