import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BatchDetailClient,
  type BatchStatus,
} from "@/components/dashboard/batch-detail-client";
import { BatchGradingSchemeEditor } from "@/components/dashboard/batch-grading-scheme-editor";
import { BatchMediaPanel } from "@/components/dashboard/batch-media-panel";
import { BatchQuizDefsEditor } from "@/components/dashboard/batch-quiz-defs-editor";
import {
  isLegacyGradeBookBatch,
  parseGradingScheme,
} from "@/lib/assessment-scheme";
import { gradeStudentForBatch, rollupBatch } from "@/lib/grading";
import { scoreTotal } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseBatchQuizDefs, quizDefsFor } from "@/lib/student-grades";

function fmt(d: Date | null): string | null {
  return d
    ? d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
}

export default async function EditBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  // Batch settings, grading scheme, and media are admin-only.
  if (session.user.role !== "admin") {
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
          bonusPoints: true,
        },
        orderBy: { enrollmentNo: "asc" },
      },
    },
  });
  if (!batch) notFound();

  const professors = await prisma.user.findMany({
    where: { role: { in: ["admin", "professor"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const imageAssets = await prisma.contentAsset.findMany({
    where: { assetType: "image" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, name: true, url: true },
  });

  // Assessment scheme (supersedes quiz definitions when present — R11).
  const scheme = parseGradingScheme(batch.gradingScheme);
  const quizDefs = quizDefsFor(batch.quizDefs);
  const hasCustomDefs = parseBatchQuizDefs(batch.quizDefs) !== null;
  const gradedStudentCount = batch.students.filter((s) => {
    const obj =
      s.granularGrades &&
      typeof s.granularGrades === "object" &&
      !Array.isArray(s.granularGrades)
        ? (s.granularGrades as Record<string, unknown>)
        : {};
    return Object.values(obj).some((v) => typeof v === "number");
  }).length;
  const hasPracticalColumnData = batch.students.some(
    (s) =>
      s.scoreFWE !== null ||
      s.scoreEP !== null ||
      s.scorePAS !== null ||
      s.scoreCCST !== null ||
      s.scoreCCSM !== null,
  );
  const legacyGradeBook = isLegacyGradeBookBatch(batch.code);

  // Projected grades — drives the graduation panel counts.
  const studentGrades = batch.students.map((s) => ({
    s,
    g: gradeStudentForBatch(s, batch),
  }));
  const summary = rollupBatch(studentGrades.map((x) => x.g));
  const inTraining = studentGrades.map(({ s, g }) => ({
    id: s.id,
    name: s.name?.trim() || s.enrollmentNo,
    enrollmentNo: s.enrollmentNo,
    photoUrl: s.photo?.url ?? null,
    total: g.weighted ?? scoreTotal(g.six),
    verdict: g.verdict,
    rank: null,
  }));

  const status: BatchStatus = batch.graduated
    ? "graduated"
    : inTraining.length > 0
      ? "training"
      : "empty";

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <Link
          href={`/dashboard/batches/${batch.id}`}
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to batch
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-on-surface">
          Edit {batch.batchNumber ? `Batch ${batch.batchNumber}` : batch.code}
          {batch.label && (
            <span className="ml-2 text-lg font-normal text-on-surface-variant">
              — {batch.label}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Settings, graduation, grading scheme, and cohort media. Changes apply
          immediately — members are managed from the batch view.
        </p>
      </div>

      <BatchDetailClient
        mode="edit"
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
        canManage
        status={status}
        inTraining={inTraining}
        graduates={[]}
        summary={summary}
      />

      {!batch.graduated && !legacyGradeBook && (
        <BatchGradingSchemeEditor
          batchId={batch.id}
          batchCode={batch.code}
          initialScheme={scheme}
          gradedStudentCount={gradedStudentCount}
          hasPracticalColumnData={hasPracticalColumnData}
        />
      )}

      {/* Quiz-only editor hides when a full scheme supersedes it (R11). */}
      {!batch.graduated && !scheme && (
        <BatchQuizDefsEditor
          batchId={batch.id}
          initialDefs={quizDefs}
          hasCustomDefs={hasCustomDefs}
          gradedStudentCount={gradedStudentCount}
        />
      )}

      <BatchMediaPanel
        batchId={batch.id}
        heroImageUrl={batch.heroImageUrl ?? null}
        galleryUrls={batch.galleryUrls ?? []}
        galleryItems={batch.galleryItems ?? null}
        assets={imageAssets}
      />
    </div>
  );
}
