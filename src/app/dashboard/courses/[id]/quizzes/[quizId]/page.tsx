import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuestion } from "@/app/dashboard/courses/actions";
import { ConfirmActionDialog } from "@/components/dashboard/confirm-action-dialog";
import {
  QuizQuestionForm,
  Trash2,
} from "@/components/dashboard/quiz-question-form";
import { QuizSettingsForm } from "@/components/dashboard/quiz-settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { coursesPrisma } from "@/lib/courses-db";
import { parseOptions } from "@/lib/lms";
import { requireAdmin } from "@/lib/session";

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  MULTIPLE_ANSWER: "Multiple answer",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
};

export default async function QuizEditorRoute({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  await requireAdmin();
  const { id, quizId } = await params;

  const quiz = await coursesPrisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!quiz || quiz.courseId !== id) notFound();

  const totalPoints = quiz.questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/dashboard/courses/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Back to course
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-on-surface">{quiz.title}</h1>
        <Badge variant={quiz.state === "PUBLISHED" ? "verified" : "neutral"}>
          {quiz.state === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>
      </div>

      {quiz.state === "PUBLISHED" && quiz.questions.length === 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/5 p-4">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-warning"
            aria-hidden
          />
          <p className="text-sm text-warning">
            This quiz is published but has no questions — graduates can open it
            yet can't earn a score. Add questions below or unpublish it from the
            curriculum.
          </p>
        </div>
      )}

      <QuizSettingsForm courseId={id} quiz={quiz} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Questions</h2>
          <p className="text-sm text-on-surface-variant">
            {quiz.questions.length} question
            {quiz.questions.length === 1 ? "" : "s"} · {totalPoints} pt
            {totalPoints === 1 ? "" : "s"}
          </p>
        </div>

        {quiz.questions.map((q, i) => (
          <Card key={q.id}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-on-surface-variant tabular-nums">
                    Q{i + 1}
                  </span>
                  <Badge variant="neutral">{TYPE_LABEL[q.type]}</Badge>
                  <span className="text-xs text-on-surface-variant">
                    {q.points} pt{q.points === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="truncate text-sm text-on-surface">{q.prompt}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <QuizQuestionForm
                  courseId={id}
                  quizId={quiz.id}
                  question={{
                    id: q.id,
                    type: q.type,
                    prompt: q.prompt,
                    points: q.points,
                    feedback: q.feedback,
                    options: parseOptions(q.options).map((o) => ({
                      text: o.text,
                      correct: o.correct,
                    })),
                    correctAnswers: q.correctAnswers,
                  }}
                />
                <ConfirmActionDialog
                  trigger={
                    <button
                      type="button"
                      title="Delete question"
                      className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  }
                  title={`Delete question ${i + 1}?`}
                  description="The question and its options are removed from this quiz permanently. Past attempt scores are unaffected."
                  confirmLabel="Delete question"
                  action={deleteQuestion}
                  fields={{ id: q.id, quizId: quiz.id, courseId: id }}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <QuizQuestionForm courseId={id} quizId={quiz.id} />
      </section>
    </div>
  );
}
