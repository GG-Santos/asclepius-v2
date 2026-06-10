"use server";

import { revalidatePath } from "next/cache";
import { uploadImage } from "@/lib/blob";
import { composeName, isLegacyBatch } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import {
  canProfessorEditBatch,
  requireAdmin,
  requireUser,
} from "@/lib/session";
import {
  buildEnrollmentNo,
  buildLcn,
  rollupGraduateScores,
} from "@/lib/student";
import { studentInputSchema } from "@/lib/validation";

export type StudentActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  promotedLcn?: string;
};

async function resolveBatch(batchCode?: string) {
  if (!batchCode) return { batchId: null, batchCode: null };
  const batch = await prisma.batch.upsert({
    where: { code: batchCode },
    create: { code: batchCode },
    update: {},
  });
  return { batchId: batch.id, batchCode: batch.code };
}

async function maybePhoto(formData: FormData, uploadedBy: string) {
  const assetId = String(formData.get("photoAssetId") ?? "").trim();
  if (assetId) {
    const a = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (a) return a.id;
  }
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const a = await uploadImage(photo, { folder: "students", uploadedBy });
    return a.id;
  }
  return undefined;
}

async function nextEnrollmentNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `S-${year}-`;
  const count = await prisma.student.count({
    where: { enrollmentNo: { startsWith: prefix } },
  });
  // Find a free number (guards against gaps/races).
  let seq = count + 1;
  while (
    await prisma.student.findUnique({
      where: { enrollmentNo: buildEnrollmentNo(year, seq) },
    })
  ) {
    seq += 1;
  }
  return buildEnrollmentNo(year, seq);
}

function fieldErrorsOf(error: {
  issues: readonly { path: PropertyKey[]; message: string }[];
}) {
  const fe: Record<string, string> = {};
  for (const i of error.issues) fe[i.path.map(String).join(".")] = i.message;
  return fe;
}

function buildStudentData(input: ReturnType<typeof studentInputSchema.parse>) {
  const granularGrades = {
    q1: input.q1 ?? null,
    q2: input.q2 ?? null,
    q3: input.q3 ?? null,
    q4: input.q4 ?? null,
    q5: input.q5 ?? null,
    q6: input.q6 ?? null,
    q7: input.q7 ?? null,
    q8: input.q8 ?? null,
    q9: input.q9 ?? null,
    q10: input.q10 ?? null,
  };
  return {
    name: composeName(input),
    firstName: input.firstName,
    middleName: input.middleName ?? null,
    lastName: input.lastName,
    suffix: input.suffix ?? null,
    scoreFWE: input.scoreFWE ?? null,
    scoreEP: input.scoreEP ?? null,
    scorePAS: input.scorePAS ?? null,
    scoreCCST: input.scoreCCST ?? null,
    scoreCCSM: input.scoreCCSM ?? null,
    granularGrades,
  };
}

export async function createStudent(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const session = await requireAdmin();
  const parsed = studentInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const { batchId, batchCode } = await resolveBatch(parsed.data.batchCode);
  const photoId = await maybePhoto(formData, session.user.id);
  const enrollmentNo = await nextEnrollmentNo();

  await prisma.student.create({
    data: {
      ...buildStudentData(parsed.data),
      enrollmentNo,
      batchId,
      batchCode,
      photoId,
      createdBy: session.user.id,
    },
  });
  revalidatePath("/dashboard/students");
  return { ok: true };
}

export async function updateStudent(
  id: string,
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const session = await requireUser();
  const existing = await prisma.student.findUnique({
    where: { id },
    select: { batchCode: true },
  });
  if (!existing) return { error: "Student not found." };
  const role = session.user.role;
  // Admins edit anyone; professors edit only their own non-graduated batches.
  if (
    role !== "admin" &&
    !(
      role === "professor" &&
      (await canProfessorEditBatch(session.user.id, existing.batchCode))
    )
  ) {
    return { error: "You can only edit students in your own active batches." };
  }

  const parsed = studentInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const { batchId, batchCode } = await resolveBatch(parsed.data.batchCode);
  // Professors can't move a student into a batch they don't own (or a graduated one).
  if (
    role === "professor" &&
    !(await canProfessorEditBatch(session.user.id, batchCode))
  ) {
    return {
      error: "You can only assign students to your own active batches.",
    };
  }
  const photoId = await maybePhoto(formData, session.user.id);

  await prisma.student.update({
    where: { id },
    data: {
      ...buildStudentData(parsed.data),
      batchId,
      batchCode,
      ...(photoId ? { photoId } : {}),
    },
  });
  revalidatePath("/dashboard/students");
  return { ok: true };
}

export async function deleteStudent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.student.delete({ where: { id } });
    revalidatePath("/dashboard/students");
  }
}

// Graduate model still has all six percentage fields (including scoreSJE).
const GRADUATE_SCORE_KEYS = [
  "scoreFWE",
  "scoreSJE",
  "scoreEP",
  "scorePAS",
  "scoreCCST",
  "scoreCCSM",
] as const;

async function recomputeBatchRankings(batchCode?: string | null) {
  if (!batchCode) return;
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

/**
 * Promote a student → create a Graduate record (assign LCN, roll up scores,
 * copy photo/name/batch, set graduation dates), archive the student, link both
 * ways, and recompute the batch rankings. Returns the new LCN.
 */
export async function promoteStudent(
  formData: FormData,
): Promise<StudentActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing student." };

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return { error: "Student not found." };
  if (student.status === "GRADUATED") {
    return { error: "This student has already graduated." };
  }
  if (!student.batchCode) {
    return { error: "Assign a batch before graduating (the LCN needs it)." };
  }

  // Sequence within the batch determines the LCN tail.
  const now = new Date();
  const inBatch = await prisma.graduate.count({
    where: { batchCode: student.batchCode },
  });
  let lcn = buildLcn(student.batchCode, now, inBatch + 1);
  let bump = inBatch + 1;
  while (await prisma.graduate.findUnique({ where: { lcn } })) {
    bump += 1;
    lcn = buildLcn(student.batchCode, now, bump);
  }

  const scores = rollupGraduateScores(student);
  const issuedAt = now;
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1-year default; editable

  await prisma.graduate.create({
    data: {
      lcn,
      name: student.name,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      suffix: student.suffix,
      ...scores,
      issuedRaw: issuedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      }),
      issuedAt,
      expirationRaw: expiresAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      }),
      expiresAt,
      status: "GRADUATE",
      legacy: isLegacyBatch(student.batchCode),
      batchId: student.batchId,
      batchCode: student.batchCode,
      photoId: student.photoId,
      fromStudentEnrollmentNo: student.enrollmentNo,
      createdBy: session.user.id,
    },
  });

  await prisma.student.update({
    where: { id },
    data: { status: "GRADUATED", graduatedToLcn: lcn },
  });

  await recomputeBatchRankings(student.batchCode);

  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/graduates");
  return { ok: true, promotedLcn: lcn };
}
