// Server helpers: per-batch grading config maps for forms whose entry tables
// must follow the SELECTED batch. Batches without (or with malformed) config
// are absent — callers fall back to legacy behavior.
import "server-only";
import {
  type GradingScheme,
  parseGradingScheme,
} from "@/lib/assessment-scheme";
import { prisma } from "@/lib/prisma";
import { parseBatchQuizDefs, type QuizDef } from "@/lib/student-grades";

export async function quizDefsByBatch(): Promise<Record<string, QuizDef[]>> {
  const batches = await prisma.batch.findMany({
    select: { code: true, quizDefs: true },
  });
  const map: Record<string, QuizDef[]> = {};
  for (const b of batches) {
    const defs = parseBatchQuizDefs(b.quizDefs);
    if (defs) map[b.code] = defs;
  }
  return map;
}

/** Batch code → full assessment scheme (supersedes quiz defs — R11). */
export async function schemesByBatch(): Promise<Record<string, GradingScheme>> {
  const batches = await prisma.batch.findMany({
    select: { code: true, gradingScheme: true },
  });
  const map: Record<string, GradingScheme> = {};
  for (const b of batches) {
    const scheme = parseGradingScheme(b.gradingScheme);
    if (scheme) map[b.code] = scheme;
  }
  return map;
}
