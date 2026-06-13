import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateStudent } from "@/app/dashboard/students/actions";
import {
  type StudentDefaults,
  StudentForm,
} from "@/components/dashboard/student-form";
import { parseGradingScheme, parseSchemeScores } from "@/lib/assessment-scheme";
import { quizDefsByBatch, schemesByBatch } from "@/lib/batch-quiz";
import { prisma } from "@/lib/prisma";
import { canProfessorEditBatch, requireUser } from "@/lib/session";
import { parseGranularGrades, quizDefsFor } from "@/lib/student-grades";

function numToStr(n: number | null | undefined): string | undefined {
  return n === null || n === undefined ? undefined : String(n);
}

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;

  const s = await prisma.student.findUnique({
    where: { id },
    include: {
      photo: true,
      batch: { select: { quizDefs: true, gradingScheme: true } },
    },
  });
  if (!s) notFound();

  // Admins edit any student; professors edit only their own active batches.
  const role = session.user.role;
  if (
    role !== "admin" &&
    !(
      role === "professor" &&
      (await canProfessorEditBatch(session.user.id, s.batchCode))
    )
  ) {
    redirect("/dashboard?denied=area");
  }

  const defs = quizDefsFor(s.batch?.quizDefs);
  const grades = parseGranularGrades(s.granularGrades, defs);
  const quizGrades: Record<string, string> = {};
  for (const def of defs) {
    const v = numToStr(grades[def.key]);
    if (v !== undefined) quizGrades[def.key] = v;
  }

  // Scheme batches: component-keyed entry values (R2/R8).
  const scheme = parseGradingScheme(s.batch?.gradingScheme);
  const schemeGrades: Record<string, string> = {};
  if (scheme) {
    const compScores = parseSchemeScores(s.granularGrades, scheme);
    for (const c of scheme.components) {
      const v = numToStr(compScores[c.key]);
      if (v !== undefined) schemeGrades[c.key] = v;
    }
  }

  const defaults: StudentDefaults = {
    enrollmentNo: s.enrollmentNo,
    firstName: s.firstName ?? undefined,
    middleName: s.middleName ?? undefined,
    lastName: s.lastName ?? undefined,
    suffix: s.suffix ?? undefined,
    phone: s.phone ?? undefined,
    gender: s.gender ?? undefined,
    streetAddress: s.streetAddress ?? undefined,
    city: s.city ?? undefined,
    province: s.province ?? undefined,
    country: s.country ?? undefined,
    mapsUrl: s.mapsUrl ?? undefined,
    batchCode: s.batchCode ?? undefined,
    quizGrades,
    schemeGrades,
    bonusPoints: numToStr(s.bonusPoints),
    bonusNote: s.bonusNote ?? undefined,
    scoreFWE: numToStr(s.scoreFWE),
    scoreEP: numToStr(s.scoreEP),
    scorePAS: numToStr(s.scorePAS),
    scoreCCST: numToStr(s.scoreCCST),
    scoreCCSM: numToStr(s.scoreCCSM),
    photoUrl: s.photo?.url ?? null,
  };

  const action = updateStudent.bind(null, s.id);

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Back to students
      </Link>
      <StudentForm
        action={action}
        defaults={defaults}
        submitLabel="Update Student"
        successMessage="Student updated."
        studentId={s.id}
        quizDefsByBatch={await quizDefsByBatch()}
        schemesByBatch={await schemesByBatch()}
      />
    </div>
  );
}
