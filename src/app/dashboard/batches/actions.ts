"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { gradeStudent } from "@/lib/grading";
import { isLegacyBatch } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { buildLcn, rollupGraduateScores } from "@/lib/student";

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
  professor: z.preprocess(
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
  const { code, batchNumber, label, professor, year } = parsed.data;
  const exists = await prisma.batch.findUnique({ where: { code } });
  if (exists) return { error: `${code} already exists.` };

  const logoAssetId = String(formData.get("logoAssetId") ?? "").trim() || null;
  const professorId = String(formData.get("professorId") ?? "").trim() || null;
  let professorName = professor ?? null;
  if (professorId && !professorName) {
    const u = await prisma.user.findUnique({
      where: { id: professorId },
      select: { name: true },
    });
    professorName = u?.name ?? null;
  }

  await prisma.batch.create({
    data: {
      code,
      batchNumber: batchNumber ?? null,
      label: label ?? null,
      professor: professorName,
      professorId,
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
  const professor = String(formData.get("professor") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const logoAssetId = String(formData.get("logoAssetId") ?? "").trim() || null;
  const professorId = String(formData.get("professorId") ?? "").trim() || null;
  let professorName = professor;
  if (professorId && !professorName) {
    const u = await prisma.user.findUnique({
      where: { id: professorId },
      select: { name: true },
    });
    professorName = u?.name ?? null;
  }

  await prisma.batch.update({
    where: { id },
    data: {
      batchNumber,
      label: label || null,
      professor: professorName,
      professorId,
      description,
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

// ── Graduation approval ──────────────────────────────────────────────────────
// Professors can't graduate a batch; they request a review and an admin
// approves (markBatchGraduated) or dismisses the request.

export async function requestGraduation(
  formData: FormData,
): Promise<BatchActionState> {
  const session = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing batch." };
  const batch = await prisma.batch.findUnique({
    where: { id },
    select: { professorId: true, graduated: true },
  });
  if (!batch) return { error: "Batch not found." };
  if (batch.graduated) return { error: "This batch is already graduated." };

  const role = session.user.role;
  const owns = role === "professor" && batch.professorId === session.user.id;
  if (role !== "admin" && !owns) return { error: "Not allowed." };

  await prisma.batch.update({
    where: { id },
    data: { graduationRequested: true },
  });
  revalidatePath(`/dashboard/batches/${id}`);
  revalidatePath("/dashboard/batches");
  return { ok: true };
}

export async function dismissGraduationRequest(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.batch.update({
    where: { id },
    data: { graduationRequested: false },
  });
  revalidatePath(`/dashboard/batches/${id}`);
  revalidatePath("/dashboard/batches");
}

// ── Batch graduation ─────────────────────────────────────────────────────────
// Marking a batch graduated converts each in-training member by the weighted
// rule: ≥70 → licensed graduate (LCN dated to the graduation date), <70 →
// withdrawn. Irreversible. Blocked while anyone still has no scores.

const GRADUATE_SCORE_KEYS = [
  "scoreFWE",
  "scoreSJE",
  "scoreEP",
  "scorePAS",
  "scoreCCST",
  "scoreCCSM",
] as const;

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

async function recomputeBatchRankings(batchCode: string) {
  const rows = await prisma.graduate.findMany({
    where: { batchCode, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      scoreFWE: true,
      scoreSJE: true,
      scoreEP: true,
      scorePAS: true,
      scoreCCST: true,
      scoreCCSM: true,
    },
  });
  const totals = rows.map((g) => ({
    id: g.id,
    total: GRADUATE_SCORE_KEYS.reduce((s, k) => s + (g[k] ?? 0), 0),
  }));
  const ranked = totals
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total);
  await Promise.all(
    totals.map((g) => {
      const pos = ranked.findIndex((r) => r.id === g.id);
      return prisma.graduate.update({
        where: { id: g.id },
        data: { ranking: pos >= 0 && pos < 3 ? pos + 1 : 0 },
      });
    }),
  );
}

function inTrainingStudents(batchId: string, batchCode: string) {
  return prisma.student.findMany({
    where: { status: "IN_TRAINING", OR: [{ batchId }, { batchCode }] },
  });
}

export type GraduationPreview = {
  graduate: { id: string; name: string; weighted: number }[];
  withdraw: { id: string; name: string; weighted: number }[];
  incomplete: { id: string; name: string }[];
};

/** Dry run — what marking this batch graduated WOULD do. Writes nothing. */
export async function previewBatchGraduation(
  id: string,
): Promise<GraduationPreview> {
  await requireAdmin();
  const out: GraduationPreview = { graduate: [], withdraw: [], incomplete: [] };
  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) return out;
  const students = await inTrainingStudents(id, batch.code);
  for (const s of students) {
    const g = gradeStudent(s);
    const name = s.name?.trim() || s.enrollmentNo;
    if (g.verdict === "incomplete") out.incomplete.push({ id: s.id, name });
    else if (g.verdict === "pass")
      out.graduate.push({ id: s.id, name, weighted: g.weighted ?? 0 });
    else out.withdraw.push({ id: s.id, name, weighted: g.weighted ?? 0 });
  }
  return out;
}

export async function markBatchGraduated(
  formData: FormData,
): Promise<BatchActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing batch." };
  const dateRaw = String(formData.get("graduatedAt") ?? "").trim();
  const graduatedAt = dateRaw ? new Date(`${dateRaw}T00:00:00`) : new Date();
  if (Number.isNaN(graduatedAt.getTime())) {
    return { error: "Invalid graduation date." };
  }

  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) return { error: "Batch not found." };
  if (batch.graduated) return { error: "This batch is already graduated." };

  const students = await inTrainingStudents(id, batch.code);
  const incomplete = students.filter(
    (s) => gradeStudent(s).verdict === "incomplete",
  );
  if (incomplete.length > 0) {
    return {
      error: `${incomplete.length} student(s) have no scores yet. Enter their results or withdraw them before graduating the batch.`,
    };
  }

  let seq = await prisma.graduate.count({ where: { batchCode: batch.code } });
  for (const s of students) {
    const g = gradeStudent(s);
    if (g.verdict === "pass") {
      seq += 1;
      let lcn = buildLcn(batch.code, graduatedAt, seq);
      while (await prisma.graduate.findUnique({ where: { lcn } })) {
        seq += 1;
        lcn = buildLcn(batch.code, graduatedAt, seq);
      }
      const scores = rollupGraduateScores(s);
      const expiresAt = new Date(graduatedAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await prisma.graduate.create({
        data: {
          lcn,
          name: s.name,
          firstName: s.firstName,
          middleName: s.middleName,
          lastName: s.lastName,
          suffix: s.suffix,
          ...scores,
          issuedAt: graduatedAt,
          issuedRaw: fmtDate(graduatedAt),
          expiresAt,
          expirationRaw: fmtDate(expiresAt),
          status: "GRADUATE",
          legacy: isLegacyBatch(batch.code),
          batchId: s.batchId,
          batchCode: batch.code,
          photoId: s.photoId,
          fromStudentEnrollmentNo: s.enrollmentNo,
          createdBy: session.user.id,
        },
      });
      await prisma.student.update({
        where: { id: s.id },
        data: { status: "GRADUATED", graduatedToLcn: lcn },
      });
    } else {
      await prisma.student.update({
        where: { id: s.id },
        data: { status: "WITHDRAWN" },
      });
    }
  }

  await prisma.batch.update({
    where: { id },
    data: { graduated: true, graduatedAt, graduationRequested: false },
  });
  await recomputeBatchRankings(batch.code);

  revalidatePath("/dashboard/batches");
  revalidatePath(`/dashboard/batches/${id}`);
  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/graduates");
  return { ok: true };
}

/* ── Cohort media (public hero + gallery) ──────────────────────────────── */

const GALLERY_CAP = 24;

const mediaUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .max(2000)
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
    message: "Only http(s) URLs are allowed",
  });

export type BatchMediaState = { ok?: boolean; error?: string };

/** Converts a thrown Prisma/update failure into an actionable message. */
function mediaUpdateError(e: unknown): BatchMediaState {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("Unknown argument") || msg.includes("heroImageUrl")) {
    return {
      error:
        "Could not save — the server is running an outdated database client. Restart the dev server and try again.",
    };
  }
  return { error: "Could not save the change. Try again." };
}

/** Sets (or clears, with an empty url) the public cohort hero image. */
export async function setBatchHero(
  formData: FormData,
): Promise<BatchMediaState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("url") ?? "").trim();
  if (!id) return { error: "Missing batch." };

  let url: string | null = null;
  if (raw) {
    const parsed = mediaUrlSchema.safeParse(raw);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid URL." };
    url = parsed.data;
  }

  try {
    await prisma.batch.update({ where: { id }, data: { heroImageUrl: url } });
  } catch (e) {
    return mediaUpdateError(e);
  }
  revalidatePath(`/dashboard/batches/${id}`);
  revalidatePath(`/cohorts/${id}`);
  return { ok: true };
}

/** Appends an image URL to the public cohort gallery (deduped, capped). */
export async function addBatchGalleryImage(
  formData: FormData,
): Promise<BatchMediaState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = mediaUrlSchema.safeParse(String(formData.get("url") ?? ""));
  if (!id) return { error: "Missing batch." };
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid URL." };

  const batch = await prisma.batch.findUnique({
    where: { id },
    select: { galleryUrls: true },
  });
  if (!batch) return { error: "Batch not found." };
  if (batch.galleryUrls.includes(parsed.data))
    return { error: "That image is already in the gallery." };
  if (batch.galleryUrls.length >= GALLERY_CAP)
    return { error: `Gallery is full (${GALLERY_CAP} images max).` };

  try {
    await prisma.batch.update({
      where: { id },
      data: { galleryUrls: [...batch.galleryUrls, parsed.data] },
    });
  } catch (e) {
    return mediaUpdateError(e);
  }
  revalidatePath(`/dashboard/batches/${id}`);
  revalidatePath(`/cohorts/${id}`);
  return { ok: true };
}

/** Removes the gallery image at the given index. */
export async function removeBatchGalleryImage(
  formData: FormData,
): Promise<BatchMediaState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const index = Number(formData.get("index"));
  if (!id || !Number.isInteger(index)) return { error: "Invalid request." };

  const batch = await prisma.batch.findUnique({
    where: { id },
    select: { galleryUrls: true },
  });
  if (!batch || index < 0 || index >= batch.galleryUrls.length)
    return { error: "Image not found." };

  const next = batch.galleryUrls.filter((_, i) => i !== index);
  try {
    await prisma.batch.update({ where: { id }, data: { galleryUrls: next } });
  } catch (e) {
    return mediaUpdateError(e);
  }
  revalidatePath(`/dashboard/batches/${id}`);
  revalidatePath(`/cohorts/${id}`);
  return { ok: true };
}

/** Swaps the gallery image at index with its neighbor ("up" = earlier). */
export async function moveBatchGalleryImage(
  formData: FormData,
): Promise<BatchMediaState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const index = Number(formData.get("index"));
  const dir = String(formData.get("dir") ?? "");
  if (!id || !Number.isInteger(index)) return { error: "Invalid request." };

  const batch = await prisma.batch.findUnique({
    where: { id },
    select: { galleryUrls: true },
  });
  if (!batch) return { error: "Batch not found." };
  const j = dir === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= batch.galleryUrls.length) {
    return { error: "Image not found." };
  }
  if (j < 0 || j >= batch.galleryUrls.length) return { ok: true };

  const next = batch.galleryUrls.slice();
  [next[index], next[j]] = [next[j], next[index]];
  try {
    await prisma.batch.update({ where: { id }, data: { galleryUrls: next } });
  } catch (e) {
    return mediaUpdateError(e);
  }
  revalidatePath(`/dashboard/batches/${id}`);
  revalidatePath(`/cohorts/${id}`);
  return { ok: true };
}
