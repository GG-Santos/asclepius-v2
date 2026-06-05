"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { certificateNumber } from "@/lib/lms";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

/** Enroll the current graduate in a published course, then open it. */
export async function enrollInCourse(formData: FormData): Promise<void> {
  const { graduate } = await requireGraduate();
  const courseId = String(formData.get("courseId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!courseId) return;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "PUBLISHED") return;

  await prisma.enrollment.upsert({
    where: {
      graduateLcn_courseId: { graduateLcn: graduate.lcn, courseId },
    },
    update: {},
    create: { graduateLcn: graduate.lcn, courseId },
  });

  revalidatePath("/portal/courses");
  if (slug) redirect(`/portal/courses/${slug}`);
}

/**
 * Mark a lesson complete for the current graduate. When every lesson in the
 * course is complete, stamp the enrollment with a completion date and a CE
 * certificate number.
 */
export async function markLessonComplete(formData: FormData): Promise<void> {
  const { graduate } = await requireGraduate();
  const lessonId = String(formData.get("lessonId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!lessonId || !courseId) return;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      graduateLcn_courseId: { graduateLcn: graduate.lcn, courseId },
    },
  });
  if (!enrollment) return;

  await prisma.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId },
    },
    update: {},
    create: { enrollmentId: enrollment.id, lessonId },
  });

  // Recompute completion against the full course curriculum.
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { modules: { include: { lessons: { select: { id: true } } } } },
  });
  const totalLessons =
    course?.modules.reduce((sum, m) => sum + m.lessons.length, 0) ?? 0;
  const doneCount = await prisma.lessonProgress.count({
    where: { enrollmentId: enrollment.id },
  });

  if (
    totalLessons > 0 &&
    doneCount >= totalLessons &&
    !enrollment.completedAt
  ) {
    const completedAt = new Date();
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        completedAt,
        certificateNo: certificateNumber(enrollment.id, completedAt),
      },
    });
  }

  revalidatePath(`/portal/courses/${slug}`);
}
