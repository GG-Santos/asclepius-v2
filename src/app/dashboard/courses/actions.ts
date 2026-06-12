"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  CompletionRequirement,
  ContentState,
  EnrollmentState,
  ItemType,
  QuestionType,
  RequirementCount,
} from "@/generated/courses";
import { coursesPrisma } from "@/lib/courses-db";
import { slugify } from "@/lib/lms";
import { prisma } from "@/lib/prisma";
import { recomputeProgression } from "@/lib/progression";
import { requireAdmin } from "@/lib/session";

export type CourseActionState = { ok?: boolean; error?: string };

const ITEM_TYPES = ["PAGE", "VIDEO", "FILE", "EXTERNAL_URL", "QUIZ"];
// Toggle actions only ever move between draft and published; DELETED is owned
// by the delete actions so a tampered form can't soft-delete via a toggle.
const PUBLISH_STATES = ["UNPUBLISHED", "PUBLISHED"];
const REQUIREMENTS = ["NONE", "MUST_VIEW", "MUST_MARK_DONE", "MUST_PASS"];
const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_ANSWER",
  "TRUE_FALSE",
  "SHORT_ANSWER",
];

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function intOrNull(fd: FormData, key: string): number | null {
  const raw = str(fd, key);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
function floatOrNull(fd: FormData, key: string): number | null {
  const raw = str(fd, key);
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}
function enumOf<T extends string>(
  fd: FormData,
  key: string,
  allowed: string[],
  fallback: T,
): T {
  const v = str(fd, key);
  return (allowed.includes(v) ? v : fallback) as T;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    const existing = await coursesPrisma.course.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

// ── Course ───────────────────────────────────────────────────────────────────

export async function createCourse(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const session = await requireAdmin();
  const title = str(formData, "title");
  if (!title) return { error: "Title is required." };
  const slug = await uniqueSlug(slugify(str(formData, "slug") || title));
  // Courses are born as drafts (Canvas: created/claimed = unpublished).
  // Publishing is an explicit lifecycle action, never a form side effect.
  const course = await coursesPrisma.course.create({
    data: {
      title,
      slug,
      summary: str(formData, "summary") || null,
      coverImage: str(formData, "coverImage") || null,
      estimatedMins: intOrNull(formData, "estimatedMins"),
      certificateEnabled: formData.get("certificateEnabled") === "on",
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
  const title = str(formData, "title");
  if (!title) return { error: "Title is required." };
  const slug = await uniqueSlug(slugify(str(formData, "slug") || title), id);
  await coursesPrisma.course.update({
    where: { id },
    data: {
      title,
      slug,
      summary: str(formData, "summary") || null,
      coverImage: str(formData, "coverImage") || null,
      estimatedMins: intOrNull(formData, "estimatedMins"),
      certificateEnabled: formData.get("certificateEnabled") === "on",
    },
  });
  revalidatePath(`/dashboard/courses/${id}`);
  revalidatePath("/dashboard/courses");
  return { ok: true };
}

export async function deleteCourse(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (id) {
    // Soft delete (Canvas workflow_state pattern): hidden everywhere, but
    // enrollments, progress, and issued certificates stay intact for records.
    await coursesPrisma.course.update({
      where: { id },
      data: { state: "DELETED" },
    });
    revalidatePath("/dashboard/courses");
  }
  redirect("/dashboard/courses");
}

// ── Course lifecycle ─────────────────────────────────────────────────────────
// Explicit, confirmed transitions (Canvas course.rb events: offer / claim /
// complete). The generic save form never touches `state`.

async function setCourseState(
  formData: FormData,
  state: "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED",
): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) return;
  const course = await coursesPrisma.course.findUnique({ where: { id } });
  if (!course || course.state === "DELETED") return;
  await coursesPrisma.course.update({ where: { id }, data: { state } });
  revalidatePath(`/dashboard/courses/${id}`);
  revalidatePath("/dashboard/courses");
  revalidatePath("/portal/courses");
}

export async function publishCourse(formData: FormData): Promise<void> {
  await setCourseState(formData, "PUBLISHED");
}

export async function unpublishCourse(formData: FormData): Promise<void> {
  await setCourseState(formData, "UNPUBLISHED");
}

export async function archiveCourse(formData: FormData): Promise<void> {
  await setCourseState(formData, "ARCHIVED");
}

/** Restore an archived course to draft for re-editing. */
export async function restoreCourse(formData: FormData): Promise<void> {
  await setCourseState(formData, "UNPUBLISHED");
}

// ── Module ───────────────────────────────────────────────────────────────────

export async function createModule(formData: FormData): Promise<void> {
  await requireAdmin();
  const courseId = str(formData, "courseId");
  const title = str(formData, "title");
  if (!courseId || !title) return;
  const count = await coursesPrisma.module.count({
    where: { courseId, state: { not: "DELETED" } },
  });
  await coursesPrisma.module.create({
    data: { courseId, title, position: count },
  });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

/**
 * Publish/unpublish a module, optionally cascading to its items (Canvas
 * publish menu: "Publish module and all items" / "Publish module only").
 * Cascading also syncs owned page/quiz content so visibility stays coherent.
 */
export async function setModuleState(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  const state = enumOf<ContentState>(
    formData,
    "state",
    PUBLISH_STATES,
    "UNPUBLISHED",
  );
  const includeItems = formData.get("includeItems") === "true";
  if (!id) return;

  await coursesPrisma.module.update({ where: { id }, data: { state } });

  if (includeItems) {
    const items = await coursesPrisma.moduleItem.findMany({
      where: { moduleId: id, state: { not: "DELETED" } },
      select: { id: true, type: true, contentId: true },
    });
    await coursesPrisma.moduleItem.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { state },
    });
    const pageIds = items
      .filter((i) => i.type === "PAGE" && i.contentId)
      .map((i) => i.contentId as string);
    const quizIds = items
      .filter((i) => i.type === "QUIZ" && i.contentId)
      .map((i) => i.contentId as string);
    if (pageIds.length > 0) {
      await coursesPrisma.page.updateMany({
        where: { id: { in: pageIds } },
        data: { state },
      });
    }
    if (quizIds.length > 0) {
      await coursesPrisma.quiz.updateMany({
        where: { id: { in: quizIds } },
        data: { state },
      });
    }
  }
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function updateModule(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  if (!id) return;
  const unlockRaw = str(formData, "unlockAt");
  await coursesPrisma.module.update({
    where: { id },
    data: {
      title: str(formData, "title"),
      requireSequentialProgress:
        formData.get("requireSequentialProgress") === "on",
      requirementCount: enumOf<RequirementCount>(
        formData,
        "requirementCount",
        ["ALL", "ONE"],
        "ALL",
      ),
      prerequisiteModuleIds: formData
        .getAll("prerequisiteModuleIds")
        .map((v) => String(v))
        .filter((v) => v && v !== id),
      unlockAt: unlockRaw ? new Date(unlockRaw) : null,
    },
  });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function deleteModule(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  if (id) {
    // Soft delete: graduates' ItemProgress rows under this module survive.
    await coursesPrisma.module.update({
      where: { id },
      data: { state: "DELETED" },
    });
    revalidatePath(`/dashboard/courses/${courseId}`);
  }
}

/** Swap a module's position with its neighbour in the given direction. */
export async function moveModule(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  const dir = str(formData, "dir"); // "up" | "down"
  if (!id || !courseId) return;
  const modules = await coursesPrisma.module.findMany({
    where: { courseId, state: { not: "DELETED" } },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });
  const idx = modules.findIndex((m) => m.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= modules.length) return;
  const a = modules[idx];
  const b = modules[swapWith];
  await coursesPrisma.$transaction([
    coursesPrisma.module.update({
      where: { id: a.id },
      data: { position: b.position },
    }),
    coursesPrisma.module.update({
      where: { id: b.id },
      data: { position: a.position },
    }),
  ]);
  revalidatePath(`/dashboard/courses/${courseId}`);
}

// ── Module items (polymorphic) ───────────────────────────────────────────────

export async function createItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const moduleId = str(formData, "moduleId");
  const courseId = str(formData, "courseId");
  const title = str(formData, "title");
  const type = enumOf<ItemType>(formData, "type", ITEM_TYPES, "PAGE");
  if (!moduleId || !courseId || !title) return;

  const position = await coursesPrisma.moduleItem.count({
    where: { moduleId, state: { not: "DELETED" } },
  });

  let contentId: string | null = null;
  let url: string | null = null;
  let completionRequirement: CompletionRequirement = "MUST_VIEW";

  if (type === "PAGE") {
    const page = await coursesPrisma.page.create({
      data: { courseId, title, body: "" },
    });
    contentId = page.id;
  } else if (type === "QUIZ") {
    const quiz = await coursesPrisma.quiz.create({
      data: { courseId, title },
    });
    contentId = quiz.id;
    completionRequirement = "MUST_PASS";
  } else {
    url = str(formData, "url") || null;
  }

  const item = await coursesPrisma.moduleItem.create({
    data: {
      moduleId,
      courseId,
      title,
      type,
      position,
      contentId,
      url,
      completionRequirement,
    },
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  // Send the author straight into the content editor for authored types.
  if (type === "PAGE" && contentId)
    redirect(`/dashboard/courses/${courseId}/pages/${contentId}`);
  if (type === "QUIZ" && contentId)
    redirect(`/dashboard/courses/${courseId}/quizzes/${contentId}`);
  void item;
}

export async function updateItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  if (!id) return;
  await coursesPrisma.moduleItem.update({
    where: { id },
    data: {
      title: str(formData, "title"),
      url: str(formData, "url") || null,
      indent: intOrNull(formData, "indent") ?? 0,
      completionRequirement: enumOf<CompletionRequirement>(
        formData,
        "completionRequirement",
        REQUIREMENTS,
        "MUST_VIEW",
      ),
      minScore: floatOrNull(formData, "minScore"),
      estimatedMins: intOrNull(formData, "estimatedMins"),
    },
  });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function deleteItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  if (!id) return;
  const item = await coursesPrisma.moduleItem.findUnique({ where: { id } });
  if (item) {
    // Soft delete the item and its owned content together; quiz submissions
    // and item progress referencing them stay intact for CE records.
    if (item.type === "PAGE" && item.contentId)
      await coursesPrisma.page
        .update({ where: { id: item.contentId }, data: { state: "DELETED" } })
        .catch(() => {});
    if (item.type === "QUIZ" && item.contentId)
      await coursesPrisma.quiz
        .update({ where: { id: item.contentId }, data: { state: "DELETED" } })
        .catch(() => {});
    await coursesPrisma.moduleItem.update({
      where: { id },
      data: { state: "DELETED" },
    });
  }
  revalidatePath(`/dashboard/courses/${courseId}`);
}

/**
 * Toggle a single item between draft and published, keeping its owned
 * page/quiz content in the same state so the portal never shows a published
 * item whose content is hidden (Canvas per-item publish icon).
 */
export async function setItemState(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  const state = enumOf<ContentState>(
    formData,
    "state",
    PUBLISH_STATES,
    "UNPUBLISHED",
  );
  if (!id) return;
  const item = await coursesPrisma.moduleItem.findUnique({ where: { id } });
  if (!item || item.state === "DELETED") return;
  await coursesPrisma.moduleItem.update({ where: { id }, data: { state } });
  if (item.type === "PAGE" && item.contentId)
    await coursesPrisma.page
      .update({ where: { id: item.contentId }, data: { state } })
      .catch(() => {});
  if (item.type === "QUIZ" && item.contentId)
    await coursesPrisma.quiz
      .update({ where: { id: item.contentId }, data: { state } })
      .catch(() => {});
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function moveItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const moduleId = str(formData, "moduleId");
  const courseId = str(formData, "courseId");
  const dir = str(formData, "dir");
  if (!id || !moduleId) return;
  const items = await coursesPrisma.moduleItem.findMany({
    where: { moduleId, state: { not: "DELETED" } },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });
  const idx = items.findIndex((i) => i.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= items.length) return;
  const a = items[idx];
  const b = items[swapWith];
  await coursesPrisma.$transaction([
    coursesPrisma.moduleItem.update({
      where: { id: a.id },
      data: { position: b.position },
    }),
    coursesPrisma.moduleItem.update({
      where: { id: b.id },
      data: { position: a.position },
    }),
  ]);
  revalidatePath(`/dashboard/courses/${courseId}`);
}

// ── Page authoring ───────────────────────────────────────────────────────────

export async function updatePage(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  if (!id) return { error: "Missing page." };
  const title = str(formData, "title");
  const state = enumOf<ContentState>(
    formData,
    "state",
    PUBLISH_STATES,
    "UNPUBLISHED",
  );
  await coursesPrisma.page.update({
    where: { id },
    data: {
      title: title || undefined,
      body: String(formData.get("body") ?? ""),
      state,
    },
  });
  // Keep the linked item's title and publish state in sync.
  await coursesPrisma.moduleItem.updateMany({
    where: { contentId: id, type: "PAGE", state: { not: "DELETED" } },
    data: { ...(title ? { title } : {}), state },
  });
  revalidatePath(`/dashboard/courses/${courseId}/pages/${id}`);
  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true };
}

// ── Quiz authoring ───────────────────────────────────────────────────────────

export async function updateQuiz(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) return { error: "Missing quiz." };
  const title = str(formData, "title");
  const state = enumOf<ContentState>(
    formData,
    "state",
    PUBLISH_STATES,
    "UNPUBLISHED",
  );

  // Bank draw link: both-or-nothing. A link without a draw count does
  // nothing in the portal, so it is normalized away.
  let bankId: string | null = str(formData, "bankId") || null;
  const drawRaw = intOrNull(formData, "bankDrawCount");
  let bankDrawCount = drawRaw && drawRaw > 0 ? drawRaw : null;
  if (bankId) {
    const bank = await coursesPrisma.questionBank.findUnique({
      where: { id: bankId },
    });
    if (!bank) bankId = null;
  }
  if (!bankId || !bankDrawCount) {
    bankId = null;
    bankDrawCount = null;
  }

  await coursesPrisma.quiz.update({
    where: { id },
    data: {
      title: title || undefined,
      description: str(formData, "description") || null,
      passingScore: floatOrNull(formData, "passingScore") ?? 70,
      allowedAttempts: intOrNull(formData, "allowedAttempts") ?? -1,
      shuffle: formData.get("shuffle") === "on",
      timeLimitMins: intOrNull(formData, "timeLimitMins"),
      bankId,
      bankDrawCount,
      state,
    },
  });
  // Keep the linked item's title and publish state in sync.
  await coursesPrisma.moduleItem.updateMany({
    where: { contentId: id, type: "QUIZ", state: { not: "DELETED" } },
    data: { ...(title ? { title } : {}), state },
  });
  const quizCourseId = str(formData, "courseId");
  revalidatePath(`/dashboard/courses/${quizCourseId}/quizzes/${id}`);
  revalidatePath(`/dashboard/courses/${quizCourseId}`);
  return { ok: true };
}

export async function saveQuestion(formData: FormData): Promise<void> {
  await requireAdmin();
  const quizId = str(formData, "quizId");
  const id = str(formData, "id"); // empty when creating
  if (!quizId) return;
  const type = enumOf<QuestionType>(
    formData,
    "type",
    QUESTION_TYPES,
    "MULTIPLE_CHOICE",
  );

  // options: parallel arrays optionText[] + optionCorrect[] (checkbox value=index)
  const texts = formData.getAll("optionText").map((v) => String(v).trim());
  const correctIdx = new Set(
    formData.getAll("optionCorrect").map((v) => String(v)),
  );
  const options = texts
    .map((text, i) => ({
      id: `o${i}`,
      text,
      correct: correctIdx.has(String(i)),
    }))
    .filter((o) => o.text);
  const correctAnswers = str(formData, "correctAnswers")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const data = {
    type,
    prompt: String(formData.get("prompt") ?? "").trim(),
    points: floatOrNull(formData, "points") ?? 1,
    feedback: str(formData, "feedback") || null,
    options: type === "SHORT_ANSWER" ? undefined : options,
    correctAnswers: type === "SHORT_ANSWER" ? correctAnswers : [],
  };

  if (id) {
    await coursesPrisma.question.update({ where: { id }, data });
  } else {
    const position = await coursesPrisma.question.count({ where: { quizId } });
    await coursesPrisma.question.create({
      data: { quizId, position, ...data },
    });
  }
  revalidatePath(
    `/dashboard/courses/${str(formData, "courseId")}/quizzes/${quizId}`,
  );
}

export async function deleteQuestion(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const quizId = str(formData, "quizId");
  const courseId = str(formData, "courseId");
  if (id) {
    await coursesPrisma.question.delete({ where: { id } });
    revalidatePath(`/dashboard/courses/${courseId}/quizzes/${quizId}`);
  }
}

// ── Question banks ───────────────────────────────────────────────────────────
// Shared pools quizzes pull from by snapshot copy or per-attempt random draw.

export async function createBank(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const session = await requireAdmin();
  const title = str(formData, "title");
  if (!title) return { error: "Title is required." };
  const bank = await coursesPrisma.questionBank.create({
    data: {
      title,
      description: str(formData, "description") || null,
      createdBy: session.user.id,
    },
  });
  revalidatePath("/dashboard/courses/banks");
  redirect(`/dashboard/courses/banks/${bank.id}`);
}

export async function updateBank(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  await requireAdmin();
  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!id) return { error: "Missing bank." };
  if (!title) return { error: "Title is required." };
  await coursesPrisma.questionBank.update({
    where: { id },
    data: { title, description: str(formData, "description") || null },
  });
  revalidatePath(`/dashboard/courses/banks/${id}`);
  revalidatePath("/dashboard/courses/banks");
  return { ok: true };
}

export async function deleteBank(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (id) {
    // Unlink dependent quizzes first so portal attempts degrade cleanly to
    // fixed-questions-only; past submissions keep their recorded scores.
    await coursesPrisma.quiz.updateMany({
      where: { bankId: id },
      data: { bankId: null, bankDrawCount: null },
    });
    await coursesPrisma.questionBank.delete({ where: { id } });
    revalidatePath("/dashboard/courses/banks");
  }
  redirect("/dashboard/courses/banks");
}

export async function saveBankQuestion(formData: FormData): Promise<void> {
  await requireAdmin();
  const bankId = str(formData, "bankId");
  const id = str(formData, "id"); // empty when creating
  if (!bankId) return;
  const type = enumOf<QuestionType>(
    formData,
    "type",
    QUESTION_TYPES,
    "MULTIPLE_CHOICE",
  );

  const texts = formData.getAll("optionText").map((v) => String(v).trim());
  const correctIdx = new Set(
    formData.getAll("optionCorrect").map((v) => String(v)),
  );
  const options = texts
    .map((text, i) => ({
      id: `o${i}`,
      text,
      correct: correctIdx.has(String(i)),
    }))
    .filter((o) => o.text);
  const correctAnswers = str(formData, "correctAnswers")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const data = {
    type,
    prompt: String(formData.get("prompt") ?? "").trim(),
    points: floatOrNull(formData, "points") ?? 1,
    feedback: str(formData, "feedback") || null,
    options: type === "SHORT_ANSWER" ? undefined : options,
    correctAnswers: type === "SHORT_ANSWER" ? correctAnswers : [],
  };

  if (id) {
    await coursesPrisma.bankQuestion.update({ where: { id }, data });
  } else {
    const position = await coursesPrisma.bankQuestion.count({
      where: { bankId },
    });
    await coursesPrisma.bankQuestion.create({
      data: { bankId, position, ...data },
    });
  }
  revalidatePath(`/dashboard/courses/banks/${bankId}`);
}

export async function deleteBankQuestion(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const bankId = str(formData, "bankId");
  if (id) {
    await coursesPrisma.bankQuestion.delete({ where: { id } });
    revalidatePath(`/dashboard/courses/banks/${bankId}`);
  }
}

/**
 * Snapshot-copy selected bank questions into a quiz. Copies are independent
 * Question rows — later bank edits never alter the quiz.
 */
export async function copyBankQuestions(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  await requireAdmin();
  const quizId = str(formData, "quizId");
  const courseId = str(formData, "courseId");
  const ids = formData
    .getAll("qid")
    .map((v) => String(v))
    .filter(Boolean);
  if (!quizId) return { error: "Missing quiz." };
  if (ids.length === 0) return { error: "Select at least one question." };

  const source = await coursesPrisma.bankQuestion.findMany({
    where: { id: { in: ids } },
    orderBy: { position: "asc" },
  });
  if (source.length === 0) return { error: "Those questions no longer exist." };

  const offset = await coursesPrisma.question.count({ where: { quizId } });
  await coursesPrisma.question.createMany({
    data: source.map((q, i) => ({
      quizId,
      position: offset + i,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      feedback: q.feedback,
      options: q.options ?? undefined,
      correctAnswers: q.correctAnswers,
    })),
  });

  revalidatePath(`/dashboard/courses/${courseId}/quizzes/${quizId}`);
  return { ok: true };
}

// ── Enrollment management (admin) ────────────────────────────────────────────
// Canvas "+People" scaled down: staff enroll graduates directly, drop them
// (INACTIVE keeps every progress row), and reinstate them.

export async function adminEnrollGraduates(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  await requireAdmin();
  const courseId = str(formData, "courseId");
  const lcns = formData
    .getAll("lcn")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (!courseId) return { error: "Missing course." };
  if (lcns.length === 0) return { error: "Select at least one graduate." };

  const course = await coursesPrisma.course.findUnique({
    where: { id: courseId },
  });
  if (!course || course.state !== "PUBLISHED") {
    return { error: "Publish the course before enrolling graduates." };
  }

  // Cross-DB soft refs: confirm every LCN exists in the main database.
  const known = await prisma.graduate.findMany({
    where: { lcn: { in: lcns } },
    select: { lcn: true },
  });
  const knownLcns = new Set(known.map((g) => g.lcn));
  const missing = lcns.filter((lcn) => !knownLcns.has(lcn));
  if (missing.length > 0) {
    return {
      error: `Unknown license number${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
    };
  }

  for (const lcn of lcns) {
    const enrollment = await coursesPrisma.enrollment.upsert({
      where: { graduateLcn_courseId: { graduateLcn: lcn, courseId } },
      update: {},
      create: { graduateLcn: lcn, courseId },
    });
    await recomputeProgression(enrollment.id);
  }

  revalidatePath(`/dashboard/courses/${courseId}/roster`);
  revalidatePath("/portal/courses");
  return { ok: true };
}

/** Drop (INACTIVE) or reinstate (ACTIVE) an enrollment without touching progress. */
export async function adminSetEnrollmentState(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const courseId = str(formData, "courseId");
  const state = enumOf<EnrollmentState>(
    formData,
    "state",
    ["ACTIVE", "INACTIVE"],
    "ACTIVE",
  );
  if (!id) return;
  const enrollment = await coursesPrisma.enrollment.findUnique({
    where: { id },
  });
  // Completed enrollments are records (certificate issued) — never toggled.
  if (!enrollment || enrollment.state === "COMPLETED") return;
  await coursesPrisma.enrollment.update({ where: { id }, data: { state } });
  if (state === "ACTIVE") await recomputeProgression(id);
  revalidatePath(`/dashboard/courses/${courseId}/roster`);
  revalidatePath("/portal/courses");
}
