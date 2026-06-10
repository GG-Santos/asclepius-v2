import { notFound, redirect } from "next/navigation";
import {
  BatchDetailClient,
  type BatchStatus,
} from "@/components/dashboard/batch-detail-client";
import { BatchMediaPanel } from "@/components/dashboard/batch-media-panel";
import { gradeStudent, rollupBatch } from "@/lib/grading";
import { scoreTotal, verificationState } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { medalFor, rankGraduates } from "@/lib/ranking";
import { requireUser } from "@/lib/session";

function fmt(d: Date | null): string | null {
  return d
    ? d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
}

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const role = session.user.role;
  if (role !== "admin" && role !== "professor") {
    redirect("/dashboard?denied=area");
  }
  const { id } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      logo: { select: { url: true } },
      students: {
        where: { status: "IN_TRAINING" },
        select: {
          id: true,
          enrollmentNo: true,
          name: true,
          photo: { select: { url: true } },
          scoreFWE: true,
          scoreEP: true,
          scorePAS: true,
          scoreCCST: true,
          scoreCCSM: true,
          granularGrades: true,
        },
        orderBy: { enrollmentNo: "asc" },
      },
      graduates: {
        select: {
          id: true,
          lcn: true,
          name: true,
          status: true,
          expiresAt: true,
          expirationRaw: true,
          photo: { select: { url: true } },
          scoreFWE: true,
          scoreSJE: true,
          scoreEP: true,
          scorePAS: true,
          scoreCCST: true,
          scoreCCSM: true,
        },
      },
    },
  });

  if (!batch) notFound();
  if (role === "professor" && batch.professorId !== session.user.id) {
    redirect("/dashboard?denied=area");
  }
  const canManage = role === "admin";

  // Accounts an admin can assign as this batch's professor.
  const professors = await prisma.user.findMany({
    where: { role: { in: ["admin", "professor"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Assets-library images offered by the cohort media picker (admin only).
  const imageAssets = canManage
    ? await prisma.contentAsset.findMany({
        where: { assetType: "image" },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { id: true, name: true, url: true },
      })
    : [];

  // In-training students: projected grade + rank within the cohort.
  const studentGrades = batch.students.map((s) => ({ s, g: gradeStudent(s) }));
  const summary = rollupBatch(studentGrades.map((x) => x.g));
  const sRank = new Map<string, number>();
  studentGrades
    .filter((x) => x.g.weighted != null)
    .sort((a, b) => (b.g.weighted ?? 0) - (a.g.weighted ?? 0))
    .forEach((x, i) => {
      sRank.set(x.s.id, i + 1);
    });
  const inTraining = studentGrades.map(({ s, g }) => ({
    id: s.id,
    name: s.name?.trim() || s.enrollmentNo,
    enrollmentNo: s.enrollmentNo,
    photoUrl: s.photo?.url ?? null,
    total: scoreTotal(g.six),
    verdict: g.verdict,
    rank: sRank.get(s.id) ?? null,
  }));

  // Graduates: weighted batch rank (non-archived) + medal + license state.
  const gRanks = rankGraduates(
    batch.graduates
      .filter((g) => verificationState(g) !== "archived")
      .map((g) => ({ id: g.id, six: g })),
  );
  const graduates = batch.graduates
    .map((g) => {
      const r = gRanks.get(g.id);
      return {
        id: g.id,
        lcn: g.lcn,
        name: g.name?.trim() || `License ${g.lcn}`,
        photoUrl: g.photo?.url ?? null,
        total: scoreTotal(g),
        rank: r?.rank ?? null,
        medal: medalFor(r?.rank ?? null),
        expirationRaw: g.expirationRaw,
        state: verificationState(g),
      };
    })
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));

  const status: BatchStatus = batch.graduated
    ? "graduated"
    : inTraining.length > 0 && graduates.length > 0
      ? "partial"
      : inTraining.length > 0
        ? "training"
        : graduates.length > 0
          ? "graduated"
          : "empty";

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">
          {batch.batchNumber ? `Batch ${batch.batchNumber}` : batch.code}
          {batch.label && (
            <span className="ml-2 text-lg font-normal text-on-surface-variant">
              — {batch.label}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {inTraining.length + graduates.length} member
          {inTraining.length + graduates.length !== 1 ? "s" : ""}
        </p>
      </div>

      <BatchDetailClient
        batch={{
          id: batch.id,
          code: batch.code,
          label: batch.label,
          professor: batch.professor,
          professorId: batch.professorId,
          description: batch.description,
          logoUrl: batch.logo?.url ?? null,
          graduated: batch.graduated,
          graduationRequested: batch.graduationRequested,
          graduatedAtLabel: fmt(batch.graduatedAt),
        }}
        professors={professors}
        canManage={canManage}
        status={status}
        inTraining={inTraining}
        graduates={graduates}
        summary={summary}
      />

      {canManage && (
        <BatchMediaPanel
          batchId={batch.id}
          heroImageUrl={batch.heroImageUrl ?? null}
          galleryUrls={batch.galleryUrls ?? []}
          assets={imageAssets}
        />
      )}
    </div>
  );
}
