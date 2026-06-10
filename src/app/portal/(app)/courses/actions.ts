"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { coursesPrisma } from "@/lib/courses-db";
import {
  type AnswerMap,
  type GradableQuestion,
  gradeQuiz,
  isRequirementSatisfied,
} from "@/lib/lms";
import { recomputeProgression } from "@/lib/progression";
import { requireGraduate } from "@/lib/session";

// ── Enrollment ───────────────────────────────────────────────────────────────

export async function enrollInCourse(formData: FormData): Promise<void> {
  const { graduate } = await requireGraduate();
  const courseId = String(formData.get("courseId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!courseId) return;

  const course = await coursesPrisma.course.findUnique({
    where: { id: courseId },
  });
  if (!course || course.state !== "PUBLISHED") return;

  const enrollment = await coursesPrisma.enrollment.upsert({
    where: { graduateLcn_courseId: { graduateLcn: graduate.lcn, courseId } },
    update: {},
    create: { graduateLcn: graduate.lcn, courseId },
  });
  await recomputeProgression(enrollment.id);

  revalidatePath("/portal/courses");
  if (slug) redirect(`/portal/courses/${slug}`);
}

// ── Item completion ──────────────────────────────────────────────────────────

async function loadAccess(graduateLcn: string, itemId: string) {
  const item = await coursesPrisma.moduleItem.findUnique({
    where: { id: itemId },
  });
  if (!item) return null;
  const enrollment = await coursesPrisma.enrollment.findUnique({
    where: { graduateLcn_courseId: { graduateLcn, courseId: item.courseId } },
  });
  // Dropped (INACTIVE) enrollments keep their records but cannot progress.
  if (!enrollment || enrollment.state === "INACTIVE") return null;
  return { item, enrollment };
}

/** Record a view; auto-completes MUST_VIEW items. */
export async function viewItem(itemId: string): Promise<void> {
  const { graduate } = await requireGraduate();
  const ctx = await loadAccess(graduate.lcn, itemId);
  if (!ctx) return;
  const { item, enrollment } = ctx;
  const complete = item.completionRequirement === "MUST_VIEW";
  await coursesPrisma.itemProgress.upsert({
    where: {
      enrollmentId_moduleItemId: {
        enrollmentId: enrollment.id,
        moduleItemId: itemId,
      },
    },
    update: {
      viewedAt: new Date(),
      ...(complete ? { completedAt: new Date() } : {}),
    },
    create: {
      enrollmentId: enrollment.id,
      moduleItemId: itemId,
      viewedAt: new Date(),
      completedAt: complete ? new Date() : null,
    },
  });
  if (complete) await recomputeProgression(enrollment.id);
}

/** Explicit "mark done" for MUST_MARK_DONE items. */
export async function markItemDone(formData: FormData): Promise<void> {
  const { graduate } = await requireGraduate();
  const itemId = String(formData.get("itemId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const ctx = await loadAccess(graduate.lcn, itemId);
  if (!ctx) return;
  const { enrollment } = ctx;
  await coursesPrisma.itemProgress.upsert({
    where: {
      enrollmentId_moduleItemId: {
        enrollmentId: enrollment.id,
        moduleItemId: itemId,
      },
    },
    update: { completedAt: new Date() },
    create: {
      enrollmentId: enrollment.id,
      moduleItemId: itemId,
      completedAt: new Date(),
    },
  });
  await recomputeProgression(enrollment.id);
  if (slug) revalidatePath(`/portal/courses/${slug}`);
}

// ── Quiz submission ──────────────────────────────────────────────────────────

export type QuizResultState = {
  ok?: boolean;
  error?: string;
  score?: number;
  passed?: boolean;
  perQuestion?: Record<string, boolean>;
};

export async function submitQuiz(
  _prev: QuizResultState,
  formData: FormData,
): Promise<QuizResultState> {
  const { graduate } = await requireGraduate();
  const itemId = String(formData.get("itemId") ?? "");
  const quizId = String(formData.get("quizId") ?? "");
  if (!itemId || !quizId) return { error: "Missing quiz." };

  const ctx = await loadAccess(graduate.lcn, itemId);
  if (!ctx) return { error: "You are not enrolled in this course." };
  const { item, enrollment } = ctx;

  const quiz = await coursesPrisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });
  if (!quiz || quiz.state !== "PUBLISHED")
    return { error: "Quiz unavailable." };

  // Attempt limit.
  const priorAttempts = await coursesPrisma.quizSubmission.count({
    where: { enrollmentId: enrollment.id, quizId },
  });
  if (quiz.allowedAttempts >= 0 && priorAttempts >= quiz.allowedAttempts) {
    return { error: "No attempts remaining." };
  }

  // Collect answers: q-<id> single value, or q-<id> repeated for multi-answer.
  const answers: AnswerMap = {};
  for (const q of quiz.questions) {
    const values = formData.getAll(`q-${q.id}`).map((v) => String(v));
    if (q.type === "MULTIPLE_ANSWER") answers[q.id] = values;
    else answers[q.id] = values[0] ?? "";
  }

  const gradable: GradableQuestion[] = quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    points: q.points,
    options: q.options,
    correctAnswers: q.correctAnswers,
  }));
  const result = gradeQuiz(
    { passingScore: quiz.passingScore, questions: gradable },
    answers,
  );

  await coursesPrisma.quizSubmission.create({
    data: {
      enrollmentId: enrollment.id,
      quizId,
      attempt: priorAttempts + 1,
      answers: answers as object,
      pointsEarned: result.pointsEarned,
      pointsPossible: result.pointsPossible,
      score: Math.round(result.score),
      passed: result.passed,
      submittedAt: new Date(),
    },
  });

  // Update item progress: best score, and completion if MUST_PASS satisfied.
  const existing = await coursesPrisma.itemProgress.findUnique({
    where: {
      enrollmentId_moduleItemId: {
        enrollmentId: enrollment.id,
        moduleItemId: itemId,
      },
    },
  });
  const bestScore = Math.max(
    existing?.bestScore ?? 0,
    Math.round(result.score),
  );
  const satisfied = isRequirementSatisfied(
    item,
    { viewed: true, markedDone: true, bestScore },
    quiz.passingScore,
  );
  await coursesPrisma.itemProgress.upsert({
    where: {
      enrollmentId_moduleItemId: {
        enrollmentId: enrollment.id,
        moduleItemId: itemId,
      },
    },
    update: {
      bestScore,
      viewedAt: existing?.viewedAt ?? new Date(),
      ...(satisfied
        ? { completedAt: existing?.completedAt ?? new Date() }
        : {}),
    },
    create: {
      enrollmentId: enrollment.id,
      moduleItemId: itemId,
      bestScore,
      viewedAt: new Date(),
      completedAt: satisfied ? new Date() : null,
    },
  });

  await recomputeProgression(enrollment.id);
  return {
    ok: true,
    score: Math.round(result.score),
    passed: result.passed,
    perQuestion: result.perQuestion,
  };
}
