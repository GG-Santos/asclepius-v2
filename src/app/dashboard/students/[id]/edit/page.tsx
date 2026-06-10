import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateStudent } from "@/app/dashboard/students/actions";
import {
  type StudentDefaults,
  StudentForm,
} from "@/components/dashboard/student-form";
import { prisma } from "@/lib/prisma";
import { canProfessorEditBatch, requireUser } from "@/lib/session";
import { parseGranularGrades } from "@/lib/student-grades";

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
    include: { photo: true },
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

  const grades = parseGranularGrades(s.granularGrades);

  const defaults: StudentDefaults = {
    enrollmentNo: s.enrollmentNo,
    firstName: s.firstName ?? undefined,
    middleName: s.middleName ?? undefined,
    lastName: s.lastName ?? undefined,
    suffix: s.suffix ?? undefined,
    batchCode: s.batchCode ?? undefined,
    q1: numToStr(grades.q1),
    q2: numToStr(grades.q2),
    q3: numToStr(grades.q3),
    q4: numToStr(grades.q4),
    q5: numToStr(grades.q5),
    q6: numToStr(grades.q6),
    q7: numToStr(grades.q7),
    q8: numToStr(grades.q8),
    q9: numToStr(grades.q9),
    q10: numToStr(grades.q10),
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
      />
    </div>
  );
}
