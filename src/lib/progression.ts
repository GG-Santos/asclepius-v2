// Progression engine — single source of truth for module lock/complete state,
// course completion, and certificate issuance. Called after every
// progress-changing action (graduate item/quiz activity, admin enrollment).
// Pure decisions live in lib/lms.ts; this function does the I/O around them.

import { coursesPrisma } from "@/lib/courses-db";
import {
  certificateNumber,
  isModuleComplete,
  isModuleUnlocked,
} from "@/lib/lms";

export async function recomputeProgression(
  enrollmentId: string,
): Promise<void> {
  const enrollment = await coursesPrisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: true },
  });
  if (!enrollment) return;

  const modules = await coursesPrisma.module.findMany({
    where: { courseId: enrollment.courseId, state: "PUBLISHED" },
    orderBy: { position: "asc" },
    include: {
      items: { where: { state: "PUBLISHED" }, orderBy: { position: "asc" } },
    },
  });

  const progress = await coursesPrisma.itemProgress.findMany({
    where: { enrollmentId },
  });
  const doneItemIds = new Set(
    progress.filter((p) => p.completedAt).map((p) => p.moduleItemId),
  );
  const isItemDone = (itemId: string) => doneItemIds.has(itemId);

  // Pass 1 — module completion from done items.
  const completedModuleIds = new Set<string>();
  for (const m of modules) {
    if (isModuleComplete(m, m.items, isItemDone)) completedModuleIds.add(m.id);
  }

  // Pass 2 — lock state from prerequisites + unlock date, then persist.
  const now = new Date();
  for (const m of modules) {
    const unlocked = isModuleUnlocked(m, completedModuleIds, now);
    const completed = completedModuleIds.has(m.id);
    const started = m.items.some((i) => isItemDone(i.id));
    const state = completed
      ? "COMPLETED"
      : !unlocked
        ? "LOCKED"
        : started
          ? "STARTED"
          : "UNLOCKED";
    await coursesPrisma.moduleProgression.upsert({
      where: { enrollmentId_moduleId: { enrollmentId, moduleId: m.id } },
      update: { state, completedAt: completed ? now : null },
      create: {
        enrollmentId,
        moduleId: m.id,
        state,
        completedAt: completed ? now : null,
      },
    });
  }

  // Course completion: every published module with requirements is complete.
  const gating = modules.filter((m) => m.items.length > 0);
  const courseComplete =
    gating.length > 0 && gating.every((m) => completedModuleIds.has(m.id));

  if (
    courseComplete &&
    enrollment.course.certificateEnabled &&
    enrollment.state === "ACTIVE" &&
    !enrollment.completedAt
  ) {
    // Final score = average best score across MUST_PASS quiz items.
    const passItemIds = modules
      .flatMap((m) => m.items)
      .filter((i) => i.completionRequirement === "MUST_PASS")
      .map((i) => i.id);
    const scores = progress
      .filter(
        (p) => passItemIds.includes(p.moduleItemId) && p.bestScore != null,
      )
      .map((p) => p.bestScore as number);
    const finalScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    await coursesPrisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        state: "COMPLETED",
        completedAt: now,
        certificateNo: certificateNumber(enrollmentId, now),
        finalScore,
      },
    });
  }
}
