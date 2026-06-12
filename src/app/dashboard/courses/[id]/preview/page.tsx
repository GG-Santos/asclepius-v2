import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoursePreview,
  type PreviewModule,
} from "@/components/dashboard/course-preview";
import { Badge } from "@/components/ui/badge";
import { coursesPrisma } from "@/lib/courses-db";
import { requireAdmin } from "@/lib/session";

export default async function CoursePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  // Exactly what the portal shows a graduate: published modules and items
  // only, in display order.
  const course = await coursesPrisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        where: { state: "PUBLISHED" },
        orderBy: { position: "asc" },
        include: {
          items: {
            where: { state: "PUBLISHED" },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
  if (!course || course.state === "DELETED") notFound();

  const modules: PreviewModule[] = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    requireSequentialProgress: m.requireSequentialProgress,
    requirementCount: m.requirementCount,
    prerequisiteModuleIds: m.prerequisiteModuleIds,
    unlockAt: m.unlockAt?.toISOString() ?? null,
    items: m.items.map((it) => ({
      id: it.id,
      title: it.title,
      type: it.type,
      completionRequirement: it.completionRequirement,
      minScore: it.minScore,
      estimatedMins: it.estimatedMins,
    })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/dashboard/courses/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> {course.title}
      </Link>

      <div>
        <p className="text-label-caps text-accent">{course.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-headline-lg text-on-surface">
            Preview as graduate
          </h1>
          {course.state !== "PUBLISHED" && (
            <Badge variant="neutral">
              {course.state === "ARCHIVED" ? "Archived" : "Draft"} — graduates
              can't see this course yet
            </Badge>
          )}
        </div>
      </div>

      <CoursePreview modules={modules} />
    </div>
  );
}
