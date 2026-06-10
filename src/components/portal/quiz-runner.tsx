"use client";

import {
  CheckCircle2,
  Clock,
  RotateCcw,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  type QuizResultState,
  submitQuiz,
} from "@/app/portal/(app)/courses/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type RunnerQuestion = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  feedback: string | null;
  options: { id: string; text: string }[]; // never includes the correct flag
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The answerable form. Owns the countdown so the timer resets each mount. */
function QuizForm({
  formAction,
  pending,
  error,
  itemId,
  quizId,
  questions,
  passingScore,
  allowedAttempts,
  attemptsLeft,
  bestScore,
  timeLimitMins,
}: {
  formAction: (payload: FormData) => void;
  pending: boolean;
  error?: string;
  itemId: string;
  quizId: string;
  questions: RunnerQuestion[];
  passingScore: number;
  allowedAttempts: number;
  attemptsLeft: number;
  bestScore: number | null;
  timeLimitMins: number | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [remaining, setRemaining] = useState<number | null>(
    timeLimitMins ? timeLimitMins * 60 : null,
  );

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      formRef.current?.requestSubmit();
      return;
    }
    const t = setTimeout(
      () => setRemaining((r) => (r === null ? null : r - 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [remaining]);

  const lowTime = remaining !== null && remaining <= 30;

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="quizId" value={quizId} />

      {remaining !== null && (
        <div
          className={`sticky top-2 z-10 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
            lowTime
              ? "border-secondary/40 bg-secondary/10 text-secondary"
              : "border-outline-variant/60 bg-card text-on-surface"
          }`}
        >
          <Clock className="size-4" aria-hidden />
          Time remaining: {formatClock(remaining)}
        </div>
      )}

      {error && (
        <p className="rounded border border-secondary/40 bg-secondary/5 px-3 py-2 text-sm text-secondary">
          {error}
        </p>
      )}

      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-on-surface">
                <span className="text-on-surface-variant">{i + 1}. </span>
                <span className="whitespace-pre-line">{q.prompt}</span>
              </p>
              <span className="shrink-0 text-xs text-on-surface-variant">
                {q.points} pt{q.points === 1 ? "" : "s"}
              </span>
            </div>

            {q.type === "SHORT_ANSWER" ? (
              <input
                name={`q-${q.id}`}
                className="h-10 w-full rounded border border-outline-variant bg-card px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Your answer"
              />
            ) : (
              <div className="space-y-1.5">
                {q.options.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-2.5 rounded border border-outline-variant/60 px-3 py-2 text-sm text-on-surface hover:bg-surface-container"
                  >
                    <input
                      type={q.type === "MULTIPLE_ANSWER" ? "checkbox" : "radio"}
                      name={`q-${q.id}`}
                      value={o.id}
                      className="size-4 accent-accent"
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-on-surface-variant">
          Pass mark {passingScore}%
          {allowedAttempts >= 0
            ? ` · ${Math.max(0, attemptsLeft)} attempt${attemptsLeft === 1 ? "" : "s"} left`
            : " · unlimited attempts"}
          {bestScore != null ? ` · best ${bestScore}%` : ""}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit quiz"}
        </Button>
      </div>
    </form>
  );
}

export function QuizRunner({
  itemId,
  quizId,
  passingScore,
  allowedAttempts,
  attemptsUsed,
  bestScore,
  done,
  timeLimitMins,
  questions,
}: {
  itemId: string;
  quizId: string;
  passingScore: number;
  allowedAttempts: number;
  attemptsUsed: number;
  bestScore: number | null;
  done: boolean;
  timeLimitMins: number | null;
  questions: RunnerQuestion[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    QuizResultState,
    FormData
  >(submitQuiz, {});
  const [retaking, setRetaking] = useState(false);

  const attemptsLeft =
    allowedAttempts < 0 ? Infinity : allowedAttempts - attemptsUsed;

  // ── Result + review ───────────────────────────────────────────────────────
  if (state.ok) {
    const passed = state.passed;
    const canRetry = !passed && attemptsLeft - 1 > 0;
    const verdicts = state.perQuestion ?? {};
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            {passed ? (
              <CheckCircle2 className="size-12 text-accent" aria-hidden />
            ) : (
              <XCircle className="size-12 text-secondary" aria-hidden />
            )}
            <div>
              <p className="text-2xl font-bold text-on-surface">
                {state.score}%
              </p>
              <p className="text-sm text-on-surface-variant">
                {passed
                  ? "Passed — requirement met."
                  : `Not passed. You need ${passingScore}% to pass.`}
              </p>
            </div>
            <div className="flex gap-2">
              {canRetry && (
                <Button variant="outline" onClick={() => router.refresh()}>
                  <RotateCcw aria-hidden /> Try again
                </Button>
              )}
              <Button onClick={() => router.refresh()}>
                {passed ? "Continue" : "Back to quiz"}
              </Button>
            </div>
            {!passed && !canRetry && allowedAttempts >= 0 && (
              <p className="text-xs text-secondary">
                No attempts remaining for this quiz.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Per-question review */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-on-surface">Review</h3>
          {questions.map((q, i) => {
            const correct = verdicts[q.id];
            return (
              <Card key={q.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  {correct ? (
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-accent"
                      aria-hidden
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 size-5 shrink-0 text-secondary"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-on-surface">
                      <span className="text-on-surface-variant">{i + 1}. </span>
                      <span className="whitespace-pre-line">{q.prompt}</span>
                    </p>
                    <p
                      className={`text-xs font-medium ${correct ? "text-accent" : "text-secondary"}`}
                    >
                      {correct ? "Correct" : "Incorrect"}
                    </p>
                    {q.feedback && (
                      <p className="text-xs text-on-surface-variant">
                        {q.feedback}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Already completed (passed previously) ─────────────────────────────────
  if (done && !retaking) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <CheckCircle2 className="size-12 text-accent" aria-hidden />
          <div>
            <p className="text-lg font-semibold text-on-surface">Quiz passed</p>
            <p className="text-sm text-on-surface-variant">
              {bestScore != null ? `Best score ${bestScore}%.` : ""} Requirement
              met.
            </p>
          </div>
          {attemptsLeft > 0 && (
            <Button variant="outline" onClick={() => setRetaking(true)}>
              <RotateCcw aria-hidden /> Retake quiz
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── No attempts left, not passed ──────────────────────────────────────────
  if (!done && attemptsLeft <= 0 && allowedAttempts >= 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <TriangleAlert className="size-10 text-secondary" aria-hidden />
          <p className="text-sm text-on-surface">
            You've used all {allowedAttempts} attempt
            {allowedAttempts === 1 ? "" : "s"} for this quiz.
          </p>
          {bestScore != null && (
            <p className="text-xs text-on-surface-variant">
              Best score {bestScore}% (pass mark {passingScore}%).
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Answerable form ───────────────────────────────────────────────────────
  return (
    <QuizForm
      formAction={formAction}
      pending={pending}
      error={state.error}
      itemId={itemId}
      quizId={quizId}
      questions={questions}
      passingScore={passingScore}
      allowedAttempts={allowedAttempts}
      attemptsLeft={attemptsLeft}
      bestScore={bestScore}
      timeLimitMins={timeLimitMins}
    />
  );
}
