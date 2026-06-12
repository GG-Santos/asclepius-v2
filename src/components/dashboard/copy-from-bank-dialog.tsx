"use client";

import { Import } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type CourseActionState,
  copyBankQuestions,
} from "@/app/dashboard/courses/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";

export type CopyableBank = {
  id: string;
  title: string;
  questions: { id: string; prompt: string; type: string; points: number }[];
};

const TYPE_SHORT: Record<string, string> = {
  MULTIPLE_CHOICE: "MC",
  MULTIPLE_ANSWER: "MA",
  TRUE_FALSE: "T/F",
  SHORT_ANSWER: "SA",
};

/**
 * Snapshot import from a question bank into a quiz: the copies are
 * independent — later bank edits never alter this quiz.
 */
export function CopyFromBankDialog({
  quizId,
  courseId,
  banks,
}: {
  quizId: string;
  courseId: string;
  banks: CopyableBank[];
}) {
  const [open, setOpen] = useState(false);
  const [bankId, setBankId] = useState(banks[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState<
    CourseActionState,
    FormData
  >(copyBankQuestions, {});
  const handled = useRef(false);

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success("Questions copied into the quiz.");
      setOpen(false);
      setTimeout(() => {
        handled.current = false;
      }, 100);
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  if (banks.length === 0) return null;
  const bank = banks.find((b) => b.id === bankId) ?? banks[0];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSelected(new Set());
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Import aria-hidden /> Copy from bank
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy questions from a bank</DialogTitle>
          <DialogDescription>
            Copies are snapshots — editing the bank later won't change this
            quiz.
          </DialogDescription>
        </DialogHeader>

        <Select
          aria-label="Question bank"
          value={bank.id}
          onChange={(e) => {
            setBankId(e.target.value);
            setSelected(new Set());
          }}
        >
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title} ({b.questions.length})
            </option>
          ))}
        </Select>

        {bank.questions.length === 0 ? (
          <p className="px-1 py-2 text-sm text-on-surface-variant">
            This bank has no questions yet.
          </p>
        ) : (
          <div className="max-h-64 space-y-0.5 overflow-y-auto rounded border border-outline-variant/60 p-1.5">
            {bank.questions.map((q) => (
              <label
                key={q.id}
                className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-surface-container"
              >
                <input
                  type="checkbox"
                  checked={selected.has(q.id)}
                  onChange={() => toggle(q.id)}
                  className="size-4 rounded border-outline-variant accent-accent"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                  {q.prompt}
                </span>
                <span className="shrink-0 text-data-mono text-xs text-on-surface-variant">
                  {TYPE_SHORT[q.type] ?? q.type} · {q.points} pt
                  {q.points === 1 ? "" : "s"}
                </span>
              </label>
            ))}
          </div>
        )}

        <form
          action={formAction}
          className="flex items-center justify-between gap-2"
        >
          <input type="hidden" name="quizId" value={quizId} />
          <input type="hidden" name="courseId" value={courseId} />
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="qid" value={id} />
          ))}
          <p className="text-sm text-on-surface-variant" aria-live="polite">
            {selected.size} selected
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || selected.size === 0}>
              {pending ? "Copying…" : "Copy into quiz"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
