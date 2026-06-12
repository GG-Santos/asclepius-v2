"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  type CourseActionState,
  updateQuiz,
} from "@/app/dashboard/courses/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type QuizSettings = {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  allowedAttempts: number;
  shuffle: boolean;
  timeLimitMins: number | null;
  bankId: string | null;
  bankDrawCount: number | null;
  state: string;
};

export type LinkableBank = {
  id: string;
  title: string;
  questionCount: number;
};

export function QuizSettingsForm({
  courseId,
  quiz,
  banks,
}: {
  courseId: string;
  quiz: QuizSettings;
  banks: LinkableBank[];
}) {
  const [state, formAction, pending] = useActionState<
    CourseActionState,
    FormData
  >(updateQuiz, {});
  const handled = useRef(false);

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success("Quiz saved.");
      setTimeout(() => {
        handled.current = false;
      }, 100);
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={quiz.id} />
          <input type="hidden" name="courseId" value={courseId} />

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="q-title">Title</Label>
            <Input
              id="q-title"
              name="title"
              defaultValue={quiz.title}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="q-desc">Description (optional)</Label>
            <Textarea
              id="q-desc"
              name="description"
              defaultValue={quiz.description ?? ""}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-pass">Passing score %</Label>
            <Input
              id="q-pass"
              name="passingScore"
              type="number"
              min={0}
              max={100}
              defaultValue={quiz.passingScore}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-attempts">
              Allowed attempts (−1 = unlimited)
            </Label>
            <Input
              id="q-attempts"
              name="allowedAttempts"
              type="number"
              min={-1}
              defaultValue={quiz.allowedAttempts}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-time">Time limit (minutes, optional)</Label>
            <Input
              id="q-time"
              name="timeLimitMins"
              type="number"
              min={0}
              defaultValue={quiz.timeLimitMins ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-state">Status</Label>
            <Select id="q-state" name="state" defaultValue={quiz.state}>
              <option value="UNPUBLISHED">Unpublished</option>
              <option value="PUBLISHED">Published</option>
            </Select>
          </div>
          <label className="flex items-center gap-2.5 sm:col-span-2">
            <input
              type="checkbox"
              name="shuffle"
              defaultChecked={quiz.shuffle}
              className="size-4 rounded border-outline-variant accent-accent"
            />
            <span className="text-sm text-on-surface">
              Shuffle question order for each attempt
            </span>
          </label>

          {banks.length > 0 && (
            <fieldset className="grid gap-3 rounded-lg border border-outline-variant/60 p-4 sm:col-span-2 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium text-on-surface">
                Question bank draw
              </legend>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-bank">Draw from bank</Label>
                <Select
                  id="q-bank"
                  name="bankId"
                  defaultValue={quiz.bankId ?? ""}
                >
                  <option value="">None</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.questionCount})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-draw">Questions per attempt</Label>
                <Input
                  id="q-draw"
                  name="bankDrawCount"
                  type="number"
                  min={1}
                  defaultValue={quiz.bankDrawCount ?? undefined}
                  placeholder="e.g. 5"
                />
              </div>
              <p className="text-xs text-on-surface-variant sm:col-span-2">
                Each attempt presents this quiz's own questions plus a fresh
                random set from the bank. Set both fields to enable the draw —
                clearing either disables it.
              </p>
            </fieldset>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save quiz"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
