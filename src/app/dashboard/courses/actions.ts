"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/lms";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type CourseActionState = { ok?: boolean; error?: string };

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

export async function createCourse(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const session = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };
  const slug = await uniqueSlug(
    slugify(String(formData.get("slug") ?? title) || title),
  );
  const course = await prisma.course.create({
    data: {
      title,
      slug,
      summary: String(formData.get("summary") ?? "").trim() || null,
      coverImage: String(formData.get("coverImage") ?? "").trim() || null,
      status:
        String(formData.get("status")) === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      createdBy: session.user.id,
    },
  });
  revalidatePath("/dashboard/courses");
  redirect(`/dashboard/courses/${course.id}`);
}

export async function updateCourse(
  id: string,
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };
  const slug = await uniqueSlug(
    slugify(String(formData.get("slug") ?? title) || title),
    id,
  );
  await prisma.course.update({
    where: { id },
    data: {
      title,
      slug,
      summary: String(formData.get("summary") ?? "").trim() || null,
      coverImage: String(formData.get("coverImage") ?? "").trim() || null,
      status:
        String(formData.get("status")) === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    },
  });
  revalidatePath(`/dashboard/courses/${id}`);
  return { ok: true };
}

export async function deleteCourse(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.course.delete({ where: { id } });
    revalidatePath("/dashboard/courses");
  }
  redirect("/dashboard/courses");
}

export async function createModule(formData: FormData): Promise<void> {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!courseId || !title) return;
  const count = await prisma.module.count({ where: { courseId } });
  await prisma.module.create({ data: { courseId, title, order: count } });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function deleteModule(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (id) {
    await prisma.module.delete({ where: { id } });
    revalidatePath(`/dashboard/courses/${courseId}`);
  }
}

export async function createLesson(formData: FormData): Promise<void> {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!moduleId || !title) return;
  const count = await prisma.lesson.count({ where: { moduleId } });
  const durationRaw = String(formData.get("durationMins") ?? "").trim();
  await prisma.lesson.create({
    data: {
      moduleId,
      title,
      content: String(formData.get("content") ?? "").trim(),
      durationMins: durationRaw ? Number.parseInt(durationRaw, 10) : null,
      order: count,
    },
  });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function updateLesson(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!id) return;
  const durationRaw = String(formData.get("durationMins") ?? "").trim();
  await prisma.lesson.update({
    where: { id },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      content: String(formData.get("content") ?? "").trim(),
      durationMins: durationRaw ? Number.parseInt(durationRaw, 10) : null,
    },
  });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function deleteLesson(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (id) {
    await prisma.lesson.delete({ where: { id } });
    revalidatePath(`/dashboard/courses/${courseId}`);
  }
}
