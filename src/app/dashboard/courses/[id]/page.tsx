import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createModule,
  deleteCourse,
  updateCourse,
} from "@/app/dashboard/courses/actions";
import { ConfirmActionDialog } from "@/components/dashboard/confirm-action-dialog";
import {
  type ChecklistStep,
  CourseChecklist,
} from "@/components/dashboard/course-checklist";
import { CourseForm } from "@/components/dashboard/course-form";
import {
  CurriculumList,
  type CurriculumModule,
} from "@/components/dashboard/curriculum-list";
import { CoursePublishControl } from "@/components/dashboard/publish-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { coursesPrisma } from "@/lib/courses-db";
import { requireAdmin } from "@/lib/session";

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const course = await coursesPrisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        where: { state: { not: "DELETED" } },
        orderBy: { position: "asc" },
        include: {
          items: {
            where: { state: { not: "DELETED" } },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
  if (!course || course.state === "DELETED") notFound();

  // Checklist + publish-coherence inputs, all derived from live data.
  const [pages, quizzes, activeEnrollments] = await Promise.all([
    coursesPrisma.page.findMany({
      where: { courseId: id, state: { not: "DELETED" } },
      select: { id: true, body: true },
    }),
    coursesPrisma.quiz.findMany({
      where: { courseId: id, state: { not: "DELETED" } },
      select: { id: true, _count: { select: { questions: true } } },
    }),
    coursesPrisma.enrollment.count({
      where: { courseId: id, state: "ACTIVE", completedAt: null },
    }),
  ]);

  const itemCount = course.modules.reduce((s, m) => s + m.items.length, 0);
  const publishedItemCount = course.modules
    .filter((m) => m.state === "PUBLISHED")
    .reduce(
      (s, m) => s + m.items.filter((i) => i.state === "PUBLISHED").length,
      0,
    );
  const hasMustPassQuiz = course.modules.some(
    (m) =>
      m.state === "PUBLISHED" &&
      m.items.some(
        (i) =>
          i.state === "PUBLISHED" &&
          i.type === "QUIZ" &&
          i.completionRequirement === "MUST_PASS",
      ),
  );

  const emptyPage = pages.find((p) => !p.body.trim());
  const emptyQuiz = quizzes.find((q) => q._count.questions === 0);

  // Canvas course-wizard rule: `done` is always computed from what exists,
  // never manually ticked.
  const checklistSteps: ChecklistStep[] = [
    {
      key: "modules",
      title: "Add a module",
      text: "Modules group your content — graduates work through them in order.",
      done: course.modules.length > 0,
      href: "#curriculum",
    },
    {
      key: "items",
      title: "Add content items",
      text: "Pages, videos, files, links, and quizzes are what graduates actually open.",
      done: itemCount > 0,
      href: "#curriculum",
    },
    {
      key: "page-content",
      title: "Write your pages",
      text: "Every page should have content before graduates see it.",
      done: pages.length > 0 ? !emptyPage : itemCount > 0,
      href: emptyPage
        ? `/dashboard/courses/${course.id}/pages/${emptyPage.id}`
        : "#curriculum",
    },
    {
      key: "quiz-questions",
      title: "Build your quizzes",
      text: "A quiz needs at least one question to produce a score.",
      done: quizzes.length > 0 ? !emptyQuiz : itemCount > 0,
      href: emptyQuiz
        ? `/dashboard/courses/${course.id}/quizzes/${emptyQuiz.id}`
        : "#curriculum",
    },
    {
      key: "cover",
      title: "Add a cover and summary",
      text: "The portal card sells the course — give it an image and a one-liner.",
      done: Boolean(course.coverImage && course.summary),
      href: "#course-settings",
    },
    {
      key: "publish-content",
      title: "Publish modules and items",
      text: "Graduates only see published modules containing published items.",
      done: publishedItemCount > 0,
      href: "#curriculum",
    },
    {
      key: "publish-course",
      title: "Publish the course",
      text: "The final step — this puts the course in the graduate portal.",
      done: course.state === "PUBLISHED",
      href: "#publish-controls",
    },
  ];

  const curriculumModules: CurriculumModule[] = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    state: m.state,
    requireSequentialProgress: m.requireSequentialProgress,
    requirementCount: m.requirementCount,
    prerequisiteModuleIds: m.prerequisiteModuleIds,
    unlockAt: m.unlockAt?.toISOString() ?? null,
    items: m.items.map((it) => ({
      id: it.id,
      title: it.title,
      type: it.type,
      url: it.url,
      indent: it.indent,
      state: it.state,
      completionRequirement: it.completionRequirement,
      minScore: it.minScore,
      estimatedMins: it.estimatedMins,
      contentId: it.contentId,
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Courses
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/courses/${course.id}/preview`}>
              <Eye aria-hidden /> Preview as graduate
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/courses/${course.id}/roster`}>
              <Users aria-hidden /> Roster
            </Link>
          </Button>
          {course.state === "PUBLISHED" && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/portal/courses/${course.slug}`} target="_blank">
                <ExternalLink aria-hidden /> View in portal
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div
        id="publish-controls"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h1 className="text-headline-lg text-on-surface">{course.title}</h1>
        <CoursePublishControl
          courseId={course.id}
          state={course.state}
          publishedItemCount={publishedItemCount}
          certificateEnabled={course.certificateEnabled}
          hasMustPassQuiz={hasMustPassQuiz}
          activeEnrollments={activeEnrollments}
        />
      </div>

      {course.state !== "ARCHIVED" && (
        <CourseChecklist steps={checklistSteps} />
      )}

      <div id="course-settings">
        <CourseForm
          action={updateCourse.bind(null, course.id)}
          submitLabel="Save course"
          showSuccessToast
          defaults={{
            title: course.title,
            slug: course.slug,
            summary: course.summary ?? undefined,
            coverImage: course.coverImage ?? undefined,
            estimatedMins: course.estimatedMins,
            certificateEnabled: course.certificateEnabled,
          }}
        />
      </div>

      <section id="curriculum" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Curriculum</h2>
          <p className="text-sm text-on-surface-variant">
            {course.modules.length} module
            {course.modules.length === 1 ? "" : "s"} · {itemCount} item
            {itemCount === 1 ? "" : "s"}
            {publishedItemCount < itemCount && (
              <span className="text-data-mono">
                {" "}
                · {publishedItemCount} live
              </span>
            )}
          </p>
        </div>

        <CurriculumList courseId={course.id} modules={curriculumModules} />

        <form
          action={createModule}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-low/40 p-5 dark:bg-white/[0.02]"
        >
          <input type="hidden" name="courseId" value={course.id} />
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="module-title"
              className="mb-1.5 block text-label-caps text-on-surface-variant"
            >
              Add module
            </label>
            <Input
              id="module-title"
              name="title"
              placeholder="e.g. Airway Management"
              required
            />
          </div>
          <Button type="submit" variant="outline">
            <Plus aria-hidden /> Add module
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-secondary/30 bg-secondary/5 p-5 dark:bg-secondary/[0.06]">
        <h2 className="text-title-md text-on-surface">Danger zone</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Deleting hides the course everywhere — dashboard and portal — while
          keeping enrollments, progress, and issued certificates on record.
          Prefer archiving to retire a finished course.
        </p>
        <div className="mt-3">
          <ConfirmActionDialog
            trigger={
              <Button type="button" variant="destructive">
                <Trash2 aria-hidden /> Delete course
              </Button>
            }
            title={`Delete course “${course.title}”?`}
            description="The course disappears from the dashboard and the portal."
            consequences={[
              `${course.modules.length} module${course.modules.length === 1 ? "" : "s"} and ${itemCount} item${itemCount === 1 ? "" : "s"} go with it`,
              `${activeEnrollments} active enrollment${activeEnrollments === 1 ? "" : "s"} lose access`,
              "Progress and certificate records are kept",
            ]}
            confirmLabel="Delete course"
            action={deleteCourse}
            fields={{ id: course.id }}
          />
        </div>
      </section>
    </div>
  );
}
