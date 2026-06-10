// Server-only read model for the graduate course experience. Assembles a
// course's published curriculum with the current graduate's progress, then
// derives module lock state and per-item availability via the lib/lms engine so
// the outline and item pages agree on what is reachable.

import { coursesPrisma } from "@/lib/courses-db";
import { isItemAvailable, isModuleComplete, isModuleUnlocked } from "@/lib/lms";

export type ViewItem = {
  id: string;
  title: string;
  type: string;
  url: string | null;
  contentId: string | null;
  completionRequirement: string;
  estimatedMins: number | null;
  done: boolean;
  available: boolean;
};

export type ViewModule = {
  id: string;
  title: string;
  unlocked: boolean;
  complete: boolean;
  items: ViewItem[];
};

export type CourseView = {
  course: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    coverImage: string | null;
    state: string;
    certificateEnabled: boolean;
  };
  enrollment: {
    id: string;
    completedAt: Date | null;
    certificateNo: string | null;
    finalScore: number | null;
  } | null;
  /** True when an enrollment exists but was dropped (INACTIVE) by staff. */
  enrollmentDropped: boolean;
  modules: ViewModule[];
  totalItems: number;
  doneItems: number;
  nextItem: { moduleId: string; itemId: string } | null;
};

export async function loadCourseView(
  graduateLcn: string,
  slug: string,
): Promise<CourseView | null> {
  const course = await coursesPrisma.course.findUnique({
    where: { slug },
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
  // Archived courses remain readable for graduates who already completed them.
  if (
    !course ||
    (course.state !== "PUBLISHED" && course.state !== "ARCHIVED")
  ) {
    return null;
  }

  const enrollmentRow = await coursesPrisma.enrollment.findUnique({
    where: { graduateLcn_courseId: { graduateLcn, courseId: course.id } },
  });
  // A dropped enrollment behaves like no enrollment (outline visible, items
  // closed) while flagging the UI to explain why instead of offering Enroll.
  const enrollmentDropped = enrollmentRow?.state === "INACTIVE";
  const enrollment = enrollmentDropped ? null : enrollmentRow;

  const progress = enrollment
    ? await coursesPrisma.itemProgress.findMany({
        where: { enrollmentId: enrollment.id },
      })
    : [];
  const doneIds = new Set(
    progress.filter((p) => p.completedAt).map((p) => p.moduleItemId),
  );
  const isItemDone = (itemId: string) => doneIds.has(itemId);

  const completedModuleIds = new Set<string>();
  for (const m of course.modules) {
    if (isModuleComplete(m, m.items, isItemDone)) completedModuleIds.add(m.id);
  }

  const now = new Date();
  let nextItem: { moduleId: string; itemId: string } | null = null;
  let totalItems = 0;
  let doneItems = 0;

  const modules: ViewModule[] = course.modules.map((m) => {
    const unlocked = isModuleUnlocked(m, completedModuleIds, now);
    const items: ViewItem[] = m.items.map((item, index) => {
      const done = isItemDone(item.id);
      const available =
        unlocked && isItemAvailable(m, m.items, index, isItemDone);
      totalItems += 1;
      if (done) doneItems += 1;
      if (!nextItem && available && !done) {
        nextItem = { moduleId: m.id, itemId: item.id };
      }
      return {
        id: item.id,
        title: item.title,
        type: item.type,
        url: item.url,
        contentId: item.contentId,
        completionRequirement: item.completionRequirement,
        estimatedMins: item.estimatedMins,
        done,
        available,
      };
    });
    return {
      id: m.id,
      title: m.title,
      unlocked,
      complete: completedModuleIds.has(m.id),
      items,
    };
  });

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      summary: course.summary,
      coverImage: course.coverImage,
      state: course.state,
      certificateEnabled: course.certificateEnabled,
    },
    enrollment: enrollment
      ? {
          id: enrollment.id,
          completedAt: enrollment.completedAt,
          certificateNo: enrollment.certificateNo,
          finalScore: enrollment.finalScore,
        }
      : null,
    enrollmentDropped,
    modules,
    totalItems,
    doneItems,
    nextItem,
  };
}
