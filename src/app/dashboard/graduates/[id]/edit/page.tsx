import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateGraduate } from "@/app/dashboard/graduates/actions";
import {
  type GraduateDefaults,
  GraduateForm,
} from "@/components/dashboard/graduate-form";
import { parseGradingScheme, parseSchemeScores } from "@/lib/assessment-scheme";
import { getExpiryPolicy } from "@/lib/org-settings";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

function numToStr(n: number | null): string | undefined {
  return n === null || n === undefined ? undefined : String(n);
}

export default async function EditGraduatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const g = await prisma.graduate.findUnique({
    where: { id },
    include: { photo: true, batch: { select: { proficiencyRows: true } } },
  });
  if (!g) notFound();

  // Granular grade entry: when the record links back to a student with a
  // batch grading scheme, raw assessment scores are edited and the six
  // proficiency columns are recomputed through the scheme on save.
  const sourceStudent = g.fromStudentEnrollmentNo
    ? await prisma.student.findUnique({
        where: { enrollmentNo: g.fromStudentEnrollmentNo },
        include: { batch: { select: { gradingScheme: true } } },
      })
    : await prisma.student.findFirst({
        where: { graduatedToLcn: g.lcn },
        include: { batch: { select: { gradingScheme: true } } },
      });
  const scheme = sourceStudent
    ? parseGradingScheme(sourceStudent.batch?.gradingScheme)
    : null;
  const granularDefaults =
    scheme && sourceStudent
      ? Object.fromEntries(
          Object.entries(
            parseSchemeScores(sourceStudent.granularGrades, scheme),
          ).map(([key, value]) => [key, value == null ? "" : String(value)]),
        )
      : {};

  const defaults: GraduateDefaults = {
    lcn: g.lcn,
    name: g.name ?? undefined,
    firstName: g.firstName ?? undefined,
    middleName: g.middleName ?? undefined,
    lastName: g.lastName ?? undefined,
    suffix: g.suffix ?? undefined,
    phone: g.phone ?? undefined,
    gender: g.gender ?? undefined,
    streetAddress: g.streetAddress ?? undefined,
    city: g.city ?? undefined,
    province: g.province ?? undefined,
    district: g.district ?? undefined,
    town: g.town ?? undefined,
    country: g.country ?? undefined,
    postalCode: g.postalCode ?? undefined,
    latitude: numToStr(g.latitude),
    longitude: numToStr(g.longitude),
    mapsUrl: g.mapsUrl ?? undefined,
    batchCode: g.batchCode ?? undefined,
    status: g.status,
    legacy: g.legacy,
    issuedRaw: g.issuedRaw ?? undefined,
    expirationRaw: g.expirationRaw ?? undefined,
    registrationRaw: g.registrationRaw ?? undefined,
    scoreFWE: numToStr(g.scoreFWE),
    scoreSJE: numToStr(g.scoreSJE),
    scoreEP: numToStr(g.scoreEP),
    scorePAS: numToStr(g.scorePAS),
    scoreCCST: numToStr(g.scoreCCST),
    scoreCCSM: numToStr(g.scoreCCSM),
    bonusPoints: numToStr(g.bonusPoints),
    ranking: numToStr(g.ranking),
    notes: g.notes ?? undefined,
    photoUrl: g.photo?.url ?? null,
    proficiencyRows: g.batch?.proficiencyRows ?? null,
  };

  const action = updateGraduate.bind(null, g.id);

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/graduates"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Back to records
      </Link>
      <GraduateForm
        action={action}
        defaults={defaults}
        submitLabel="Update Record"
        successMessage="Record updated."
        lockLcn
        deleteId={g.id}
        validityYears={(await getExpiryPolicy()).licenseValidityYears}
        scheme={scheme}
        granularDefaults={granularDefaults}
        bonusNote={sourceStudent?.bonusNote ?? ""}
      />
    </div>
  );
}
