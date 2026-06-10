// LMS domain engine — pure functions for grading, completion requirements, and
// module unlocking. No database access lives here: server actions map rows to
// these shapes and persist the results. Mirrors Canvas semantics (completion
// requirements, requirement_count ALL/ONE, prerequisites, sequential progress)
// scaled to the EMT CE portal.

import {
  CompletionRequirement,
  QuestionType,
  RequirementCount,
} from "@/generated/courses";

// ─────────────────────────────────────────────────────────────────────────────
// Slugs / formatting
// ─────────────────────────────────────────────────────────────────────────────

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "course"
  );
}

/** Completion ratio 0..1 given total and completed counts. */
export function progressRatio(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(1, completed / total);
}

/** CE certificate number: CE-YYMM-<6-char id tail>. */
export function certificateNumber(enrollmentId: string, date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `CE-${yy}${mm}-${enrollmentId.slice(-6).toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz grading
// ─────────────────────────────────────────────────────────────────────────────

export type QuizOption = { id: string; text: string; correct: boolean };

/** A single graduate answer: an option id, several option ids, or free text. */
export type Answer = string | string[];
export type AnswerMap = Record<string, Answer | undefined>;

export type GradableQuestion = {
  id: string;
  type: QuestionType;
  points: number;
  options: unknown; // stored JSON; parsed via parseOptions
  correctAnswers: string[]; // SHORT_ANSWER accepted answers
};

export function parseOptions(raw: unknown): QuizOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((o) => {
    if (o && typeof o === "object" && "id" in o && "text" in o) {
      const opt = o as Record<string, unknown>;
      return [
        {
          id: String(opt.id),
          text: String(opt.text),
          correct: Boolean(opt.correct),
        },
      ];
    }
    return [];
  });
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when an answer fully satisfies a question (all-or-nothing scoring). */
export function isAnswerCorrect(
  q: GradableQuestion,
  answer: Answer | undefined,
): boolean {
  if (answer == null) return false;

  if (q.type === QuestionType.SHORT_ANSWER) {
    const given = normalizeText(
      Array.isArray(answer) ? answer.join(" ") : answer,
    );
    return q.correctAnswers.some((a) => normalizeText(a) === given);
  }

  const correctIds = parseOptions(q.options)
    .filter((o) => o.correct)
    .map((o) => o.id);

  if (q.type === QuestionType.MULTIPLE_ANSWER) {
    const given = new Set(Array.isArray(answer) ? answer : [answer]);
    return (
      correctIds.length > 0 &&
      given.size === correctIds.length &&
      correctIds.every((id) => given.has(id))
    );
  }

  // MULTIPLE_CHOICE / TRUE_FALSE — exactly one correct option.
  const given = Array.isArray(answer) ? answer[0] : answer;
  return correctIds.length === 1 && given === correctIds[0];
}

export type GradedQuiz = {
  pointsEarned: number;
  pointsPossible: number;
  score: number; // percent (0–100)
  passed: boolean;
  perQuestion: Record<string, boolean>;
};

export function gradeQuiz(
  quiz: { passingScore: number; questions: GradableQuestion[] },
  answers: AnswerMap,
): GradedQuiz {
  let earned = 0;
  let possible = 0;
  const perQuestion: Record<string, boolean> = {};

  for (const q of quiz.questions) {
    possible += q.points;
    const correct = isAnswerCorrect(q, answers[q.id]);
    perQuestion[q.id] = correct;
    if (correct) earned += q.points;
  }

  const score = possible > 0 ? (earned / possible) * 100 : 0;
  return {
    pointsEarned: earned,
    pointsPossible: possible,
    score,
    passed: score >= quiz.passingScore,
    perQuestion,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion requirements & module progression
// ─────────────────────────────────────────────────────────────────────────────

export type RequirementItem = {
  id: string;
  completionRequirement: CompletionRequirement;
};

/** Items that actually gate module completion (a real requirement set). */
export function requiredItems<T extends RequirementItem>(items: T[]): T[] {
  return items.filter(
    (i) => i.completionRequirement !== CompletionRequirement.NONE,
  );
}

/**
 * Is a module complete? With RequirementCount.ALL every required item must be
 * done; with ONE a single one suffices. A module with no requirements is
 * complete as soon as it is reached.
 */
export function isModuleComplete(
  module: { requirementCount: RequirementCount },
  items: RequirementItem[],
  isItemDone: (itemId: string) => boolean,
): boolean {
  const required = requiredItems(items);
  if (required.length === 0) return true;
  if (module.requirementCount === RequirementCount.ONE) {
    return required.some((i) => isItemDone(i.id));
  }
  return required.every((i) => isItemDone(i.id));
}

/**
 * Is a module unlocked? Locked while any prerequisite module is incomplete or
 * the time gate has not passed.
 */
export function isModuleUnlocked(
  module: { prerequisiteModuleIds: string[]; unlockAt: Date | null },
  completedModuleIds: ReadonlySet<string>,
  now: Date,
): boolean {
  if (module.unlockAt && now < module.unlockAt) return false;
  return module.prerequisiteModuleIds.every((id) => completedModuleIds.has(id));
}

/**
 * Within a module that requires sequential progress, an item is available only
 * once every earlier required item is done. Non-sequential modules make all
 * items available at once. `items` must be in display order.
 */
export function isItemAvailable(
  module: { requireSequentialProgress: boolean },
  items: RequirementItem[],
  index: number,
  isItemDone: (itemId: string) => boolean,
): boolean {
  if (!module.requireSequentialProgress) return true;
  for (let i = 0; i < index; i++) {
    const prior = items[i];
    if (
      prior.completionRequirement !== CompletionRequirement.NONE &&
      !isItemDone(prior.id)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Whether completing `itemId` satisfies its requirement, given a view flag and
 * the best quiz score so far. MUST_PASS checks score against the threshold.
 */
export function isRequirementSatisfied(
  item: {
    completionRequirement: CompletionRequirement;
    minScore: number | null;
  },
  signals: { viewed: boolean; markedDone: boolean; bestScore: number | null },
  quizPassingScore: number | null,
): boolean {
  switch (item.completionRequirement) {
    case CompletionRequirement.NONE:
      return true;
    case CompletionRequirement.MUST_VIEW:
      return signals.viewed;
    case CompletionRequirement.MUST_MARK_DONE:
      return signals.markedDone;
    case CompletionRequirement.MUST_PASS: {
      const threshold = item.minScore ?? quizPassingScore ?? 0;
      return signals.bestScore != null && signals.bestScore >= threshold;
    }
    default:
      return false;
  }
}
