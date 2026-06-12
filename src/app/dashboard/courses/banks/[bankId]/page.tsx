import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteBank,
  deleteBankQuestion,
} from "@/app/dashboard/courses/actions";
import { BankSettingsForm } from "@/components/dashboard/bank-forms";
import { ConfirmActionDialog } from "@/components/dashboard/confirm-action-dialog";
import { QuizQuestionForm } from "@/components/dashboard/quiz-question-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function QuestionBankEditorPage({
  params,
}: {
  params: Promise<{ bankId: string }>;
}) {
  await requireAdmin();
  const { bankId } = await params;

  const bank = await coursesPrisma.questionBank.findUnique({
    where: { id: bankId },
    include: {
      questions: { orderBy: { position: "asc" } },
      quizzes: { select: { id: true, title: true, courseId: true } },
    },
  });
  if (!bank) notFound();

  const totalPoints = bank.questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/courses/banks"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Question banks
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-on-surface">{bank.title}</h1>
        {bank.quizzes.length > 0 && (
          <Badge variant="primary">
            Draws into {bank.quizzes.length} quiz
            {bank.quizzes.length === 1 ? "" : "zes"}
          </Badge>
        )}
      </div>

      <BankSettingsForm
        bank={{
          id: bank.id,
          title: bank.title,
          description: bank.description,
        }}
      />

      {bank.quizzes.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 p-4">
            <p className="text-sm font-medium text-on-surface">
              Linked quizzes draw from this bank on every attempt
            </p>
            <ul className="space-y-1">
              {bank.quizzes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/dashboard/courses/${q.courseId}/quizzes/${q.id}`}
                    className="text-sm text-accent hover:underline"
                  >
                    {q.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-on-surface-variant">
              Edits here affect future attempts of these quizzes. Copied
              (snapshot) questions are not affected.
            </p>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Questions</h2>
          <p className="text-sm text-on-surface-variant">
            {bank.questions.length} question
            {bank.questions.length === 1 ? "" : "s"} · {totalPoints} pt
            {totalPoints === 1 ? "" : "s"}
          </p>
        </div>

        {bank.questions.map((q, i) => (
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
                  bankId={bank.id}
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
                  title={`Delete question ${i + 1} from this bank?`}
                  description="The question is removed permanently. Snapshot copies already inside quizzes and past attempt scores are unaffected."
                  confirmLabel="Delete question"
                  action={deleteBankQuestion}
                  fields={{ id: q.id, bankId: bank.id }}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <QuizQuestionForm bankId={bank.id} />
      </section>

      <section className="rounded-lg border border-secondary/30 bg-secondary/5 p-5 dark:bg-secondary/[0.06]">
        <h2 className="text-title-md text-on-surface">Danger zone</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Deleting removes the bank and its questions permanently. Linked
          quizzes stop drawing from it; their own questions, snapshot copies,
          and recorded attempts are untouched.
        </p>
        <div className="mt-3">
          <ConfirmActionDialog
            trigger={
              <Button type="button" variant="destructive">
                <Trash2 aria-hidden /> Delete bank
              </Button>
            }
            title={`Delete bank “${bank.title}”?`}
            description="The bank and its questions are removed permanently."
            consequences={[
              `${bank.questions.length} question${bank.questions.length === 1 ? "" : "s"} go with it`,
              bank.quizzes.length > 0
                ? `${bank.quizzes.length} linked quiz${bank.quizzes.length === 1 ? "" : "zes"} stop drawing from it`
                : "No quizzes currently draw from it",
              "Snapshot copies and recorded attempts are kept",
            ]}
            confirmLabel="Delete bank"
            action={deleteBank}
            fields={{ id: bank.id }}
          />
        </div>
      </section>
    </div>
  );
}
