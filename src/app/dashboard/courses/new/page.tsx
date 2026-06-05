import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createCourse } from "@/app/dashboard/courses/actions";
import { CourseForm } from "@/components/dashboard/course-form";
import { requireAdmin } from "@/lib/session";

export default async function NewCoursePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/courses"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Courses
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-on-surface">New course</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Create the course, then add modules and lessons.
        </p>
      </div>
      <CourseForm action={createCourse} submitLabel="Create course" />
    </div>
  );
}
