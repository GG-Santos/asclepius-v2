import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createStudent } from "@/app/dashboard/students/actions";
import { StudentForm } from "@/components/dashboard/student-form";
import { requireAdmin } from "@/lib/session";

export default async function NewStudentPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Back to students
      </Link>
      <StudentForm
        action={createStudent}
        submitLabel="Create Student"
        successMessage="Student created."
      />
    </div>
  );
}
