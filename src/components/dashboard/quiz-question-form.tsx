"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { saveQuestion } from "@/app/dashboard/courses/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Opt = { text: string; correct: boolean };

export type QuestionValues = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  feedback: string | null;
  options: Opt[];
  correctAnswers: string[];
};

const SINGLE_ANSWER = new Set(["MULTIPLE_CHOICE", "TRUE_FALSE"]);

export function QuizQuestionForm({
  courseId,
  quizId,
  question,
}: {
  courseId: string;
  quizId: string;
  question?: QuestionValues;
}) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(question);
  const [type, setType] = useState(question?.type ?? "MULTIPLE_CHOICE");
  const [options, setOptions] = useState<Opt[]>(
    question?.options.length
      ? question.options
      : [
          { text: "", correct: true },
          { text: "", correct: false },
        ],
  );

  function changeType(next: string) {
    setType(next);
    if (next === "TRUE_FALSE") {
      setOptions([
        { text: "True", correct: true },
        { text: "False", correct: false },
      ]);
    } else if (options.length < 2) {
      setOptions([
        { text: "", correct: true },
        { text: "", correct: false },
      ]);
    }
  }

  function setCorrect(idx: number) {
    setOptions((prev) =>
      prev.map((o, i) =>
        SINGLE_ANSWER.has(type)
          ? { ...o, correct: i === idx }
          : i === idx
            ? { ...o, correct: !o.correct }
            : o,
      ),
    );
  }

  const showOptions = type !== "SHORT_ANSWER";
  const lockText = type === "TRUE_FALSE";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <button
            type="button"
            title="Edit question"
            className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
          >
            <Pencil className="size-4" />
          </button>
        ) : (
          <Button type="button" variant="outline" size="sm">
            <Plus aria-hidden /> Add question
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit question" : "New question"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={saveQuestion}
          onSubmit={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="quizId" value={quizId} />
          {editing && <input type="hidden" name="id" value={question?.id} />}
          <input type="hidden" name="type" value={type} />

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-type">Type</Label>
              <Select
                id="q-type"
                value={type}
                onChange={(e) => changeType(e.target.value)}
              >
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
                <option value="MULTIPLE_ANSWER">Multiple answer</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short answer</option>
              </Select>
            </div>
            <div className="flex w-24 flex-col gap-1.5">
              <Label htmlFor="q-points">Points</Label>
              <Input
                id="q-points"
                name="points"
                type="number"
                min={0}
                step={0.5}
                defaultValue={question?.points ?? 1}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-prompt">Question</Label>
            <Textarea
              id="q-prompt"
              name="prompt"
              defaultValue={question?.prompt}
              rows={3}
              required
            />
          </div>

          {showOptions && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-on-surface">
                Options{" "}
                <span className="font-normal text-on-surface-variant">
                  (mark the correct one{type === "MULTIPLE_ANSWER" ? "s" : ""})
                </span>
              </legend>
              {options.map((o, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: positional option rows
                <div key={i} className="flex items-center gap-2">
                  <input
                    type={SINGLE_ANSWER.has(type) ? "radio" : "checkbox"}
                    name="optionCorrect"
                    value={i}
                    checked={o.correct}
                    onChange={() => setCorrect(i)}
                    className="size-4 accent-accent"
                  />
                  <input
                    name="optionText"
                    value={o.text}
                    readOnly={lockText}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((p, pi) =>
                          pi === i ? { ...p, text: e.target.value } : p,
                        ),
                      )
                    }
                    placeholder={`Option ${i + 1}`}
                    className="h-10 flex-1 rounded border border-outline-variant bg-card px-3 text-sm focus:border-accent focus:outline-none"
                  />
                  {!lockText && options.length > 2 && (
                    <button
                      type="button"
                      title="Remove option"
                      onClick={() =>
                        setOptions((prev) => prev.filter((_, pi) => pi !== i))
                      }
                      className="rounded p-1.5 text-on-surface-variant hover:text-secondary"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {!lockText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() =>
                    setOptions((prev) => [
                      ...prev,
                      { text: "", correct: false },
                    ])
                  }
                >
                  <Plus aria-hidden /> Add option
                </Button>
              )}
            </fieldset>
          )}

          {type === "SHORT_ANSWER" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-answers">
                Accepted answers (one per line, case-insensitive)
              </Label>
              <Textarea
                id="q-answers"
                name="correctAnswers"
                defaultValue={question?.correctAnswers.join("\n")}
                rows={3}
                className="font-mono"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-feedback">Feedback (optional)</Label>
            <Textarea
              id="q-feedback"
              name="feedback"
              defaultValue={question?.feedback ?? ""}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save" : "Add question"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { Trash2 };
