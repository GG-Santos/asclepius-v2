"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authProvision } from "@/lib/auth-provision";
import { uploadImage } from "@/lib/blob";
import { composeName, isLegacyBatch, parseLooseDate } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { graduateInputSchema } from "@/lib/validation";

const SCORE_KEYS = [
  "scoreFWE",
  "scoreSJE",
  "scoreEP",
  "scorePAS",
  "scoreCCST",
  "scoreCCSM",
] as const;

/**
 * Recompute podium rankings for a batch: the top 3 by total score get 1/2/3,
 * everyone else 0. Archived records are excluded. Ranking is fully automatic.
 */
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
    total: SCORE_KEYS.reduce((s, k) => s + (g[k] ?? 0), 0),
  }));
  const ranked = totals
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total);
  await Promise.all(
    totals.map((g) => {
      const pos = ranked.findIndex((r) => r.id === g.id);
      const ranking = pos >= 0 && pos < 3 ? pos + 1 : 0;
      return prisma.graduate.update({ where: { id: g.id }, data: { ranking } });
    }),
  );
}

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
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

function buildData(input: ReturnType<typeof graduateInputSchema.parse>) {
  // Prefer a name composed from structured parts; fall back to the raw name
  // field (legacy records that were never split).
  const composed = composeName(input);
  return {
    lcn: input.lcn,
    name: composed ?? input.name ?? null,
    firstName: input.firstName ?? null,
    middleName: input.middleName ?? null,
    lastName: input.lastName ?? null,
    suffix: input.suffix ?? null,
    issuedRaw: input.issuedRaw ?? null,
    issuedAt: parseLooseDate(input.issuedRaw),
    expirationRaw: input.expirationRaw ?? null,
    expiresAt: parseLooseDate(input.expirationRaw),
    registrationRaw: input.registrationRaw ?? null,
    registeredAt: parseLooseDate(input.registrationRaw),
    scoreFWE: input.scoreFWE ?? null,
    scoreSJE: input.scoreSJE ?? null,
    scoreEP: input.scoreEP ?? null,
    scorePAS: input.scorePAS ?? null,
    scoreCCST: input.scoreCCST ?? null,
    scoreCCSM: input.scoreCCSM ?? null,
    status: input.status,
    // Legacy is automatic: batches 5 and below only.
    legacy: isLegacyBatch(input.batchCode),
    notes: input.notes ?? null,
    // ranking is computed automatically (recomputeBatchRankings), not entered.
  };
}

async function maybeUploadPhoto(
  formData: FormData,
  uploadedBy: string,
): Promise<string | undefined> {
  // Preferred path: the photo was uploaded live to Vercel Blob via /api/upload
  // and we received its MediaAsset id.
  const assetId = String(formData.get("photoAssetId") ?? "").trim();
  if (assetId) {
    const exists = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (exists) return exists.id;
  }
  // Fallback: a raw file was submitted (no-JS path).
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const asset = await uploadImage(photo, { folder: "graduates", uploadedBy });
    return asset.id;
  }
  return undefined;
}

export async function createGraduate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = graduateInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const exists = await prisma.graduate.findUnique({
    where: { lcn: parsed.data.lcn },
  });
  if (exists) {
    return {
      error: `A record with license ${parsed.data.lcn} already exists.`,
    };
  }

  const { batchId, batchCode } = await resolveBatch(parsed.data.batchCode);
  const photoId = await maybeUploadPhoto(formData, session.user.id);

  await prisma.graduate.create({
    data: {
      ...buildData(parsed.data),
      batchId,
      batchCode,
      photoId,
      createdBy: session.user.id,
    },
  });

  await recomputeBatchRankings(batchCode);
  revalidatePath("/dashboard/graduates");
  return { ok: true };
}

export async function updateGraduate(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = graduateInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const clash = await prisma.graduate.findUnique({
    where: { lcn: parsed.data.lcn },
  });
  if (clash && clash.id !== id) {
    return { error: `Another record already uses license ${parsed.data.lcn}.` };
  }

  const previous = await prisma.graduate.findUnique({
    where: { id },
    select: { batchCode: true },
  });
  const { batchId, batchCode } = await resolveBatch(parsed.data.batchCode);
  const photoId = await maybeUploadPhoto(formData, session.user.id);

  await prisma.graduate.update({
    where: { id },
    data: {
      ...buildData(parsed.data),
      batchId,
      batchCode,
      ...(photoId ? { photoId } : {}),
    },
  });

  // Recompute rankings for the new batch, and the old one if it changed.
  await recomputeBatchRankings(batchCode);
  if (previous?.batchCode && previous.batchCode !== batchCode) {
    await recomputeBatchRankings(previous.batchCode);
  }

  revalidatePath("/dashboard/graduates");
  revalidatePath(`/verify/${parsed.data.lcn}`);
  return { ok: true };
}

export async function deleteGraduate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const removed = await prisma.graduate.delete({
      where: { id },
      select: { batchCode: true },
    });
    await recomputeBatchRankings(removed.batchCode);
    revalidatePath("/dashboard/graduates");
  }
}

const accountSchema = z.object({
  lcn: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

/** Admin creates a graduate portal account for a Graduate (invite/override). */
export async function createGraduateAccount(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  const parsed = accountSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { lcn, email, password } = parsed.data;

  const graduate = await prisma.graduate.findUnique({ where: { lcn } });
  if (!graduate) return { error: "Graduate not found." };

  const existing = await prisma.user.findFirst({ where: { graduateLcn: lcn } });
  if (existing) return { error: "This graduate already has a portal account." };
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "That email is already in use." };
  }

  try {
    await authProvision.api.signUpEmail({
      body: { name: graduate.name ?? `Graduate ${lcn}`, email, password },
    });
  } catch {
    return { error: "Could not create the account." };
  }
  await prisma.user.update({
    where: { email },
    data: { role: "graduate", graduateLcn: lcn, emailVerified: true },
  });
  revalidatePath(`/dashboard/graduates/${graduate.id}`);
  return { ok: true };
}

/** "MMM dd, yyyy" — the registry's raw date string style. */
function formatRawDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * One-click renewal: the license gains one year past its current expiry, and
 * the previous expiry becomes the latest re-certification date. With no
 * expiry on record, the year counts from today.
 */
export async function renewGraduate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const g = await prisma.graduate.findUnique({ where: { id } });
  if (!g || g.status !== "GRADUATE") return;

  const base = g.expiresAt ?? new Date();
  const newExpiry = new Date(base);
  newExpiry.setFullYear(newExpiry.getFullYear() + 1);

  await prisma.graduate.update({
    where: { id },
    data: {
      // Previous expiry → latest re-certification (kept if none existed).
      registeredAt: g.expiresAt ?? g.registeredAt,
      registrationRaw:
        g.expirationRaw ??
        (g.expiresAt ? formatRawDate(g.expiresAt) : g.registrationRaw),
      expiresAt: newExpiry,
      expirationRaw: formatRawDate(newExpiry),
    },
  });

  revalidatePath("/dashboard/graduates");
  revalidatePath(`/dashboard/graduates/${id}`);
}

export async function setGraduateStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    id &&
    (status === "STUDENT" || status === "GRADUATE" || status === "ARCHIVED")
  ) {
    await prisma.graduate.update({ where: { id }, data: { status } });
    revalidatePath("/dashboard/graduates");
  }
}

/**
 * Auto-archive graduates whose license has been expired for 2+ years
 * (GRADUATE → ARCHIVED). Idempotent — a no-op when nothing qualifies. Run
 * opportunistically on admin app load (and safe to call from a cron route).
 */
export async function autoArchiveExpired(): Promise<{ archived: number }> {
  await requireAdmin();
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);
  const res = await prisma.graduate.updateMany({
    where: { status: "GRADUATE", expiresAt: { lt: cutoff } },
    data: { status: "ARCHIVED" },
  });
  if (res.count > 0) {
    revalidatePath("/dashboard/graduates");
    revalidatePath("/dashboard/batches");
  }
  return { archived: res.count };
}
