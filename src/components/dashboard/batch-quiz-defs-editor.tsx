"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBatchQuizDefs } from "@/app/dashboard/batches/actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUIZ_DEFS, type QuizDef } from "@/lib/student-grades";

type Row = {
  label: string;
  maxScore: string;
  passing: string;
  topics: string;
  date: string;
};

function toRows(defs: readonly QuizDef[]): Row[] {
  return defs.map((d) => ({
    label: d.label,
    maxScore: String(d.maxScore),
    passing: String(d.passing),
    topics: d.topics ?? "",
    date: d.date ?? "",
  }));
}

/**
 * Per-batch quiz definitions (R12). Keys stay positional (q1..qN); editing
 * never touches entered raw grades — derived pass/fail and SJE recompute.
 */
export function BatchQuizDefsEditor({
  batchId,
  initialDefs,
  hasCustomDefs,
  gradedStudentCount,
}: {
  batchId: string;
  /** The defs currently in force (custom, or the legacy defaults). */
  initialDefs: QuizDef[];
  hasCustomDefs: boolean;
  /** Students in this batch with at least one quiz grade entered. */
  gradedStudentCount: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => toRows(initialDefs));
  const [pending, startTransition] = useTransition();
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function patch(i: number, field: keyof Row, value: string) {
    setRows((r) =>
      r.map((row, j) => (j === i ? { ...row, [field]: value } : row)),
    );
  }

  function save() {
    const defs = rows.map((r, i) => ({
      key: `q${i + 1}`,
      label: r.label.trim() || `Q${i + 1}`,
      maxScore: Number(r.maxScore),
      passing: Number(r.passing),
      ...(r.topics.trim() ? { topics: r.topics.trim() } : {}),
      ...(r.date ? { date: r.date } : {}),
    }));
    for (const d of defs) {
      if (!Number.isFinite(d.maxScore) || d.maxScore <= 0) {
        toast.error(`${d.label}: max score must be above 0.`);
        return;
      }
      if (
        !Number.isFinite(d.passing) ||
        d.passing < 0 ||
        d.passing > d.maxScore
      ) {
        toast.error(`${d.label}: passing mark must be within 0–${d.maxScore}.`);
        return;
      }
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", batchId);
      fd.set("quizDefs", JSON.stringify(defs));
      const result = await updateBatchQuizDefs({}, fd);
      if (result.ok) {
        toast.success(
          `Saved ${defs.length} quiz definition(s) for this batch.`,
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not save quiz definitions.");
      }
    });
  }

  function resetToDefaults() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", batchId);
      fd.set("quizDefs", "null");
      const result = await updateBatchQuizDefs({}, fd);
      if (result.ok) {
        setRows(toRows(QUIZ_DEFS));
        toast.success("Batch now uses the standard q1–q10 quiz set.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not reset quiz definitions.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">
          Periodic exams (quizzes)
          <span className="ml-2 text-xs font-normal text-on-surface-variant">
            {hasCustomDefs ? "custom for this batch" : "standard set"}
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {hasCustomDefs && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw aria-hidden /> Use standard set
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              gradedStudentCount > 0 ? setConfirmSave(true) : save()
            }
          >
            Save quizzes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-md border border-outline-variant/60">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Topics (optional)</th>
                <th className="px-3 py-2 text-center font-semibold">Date</th>
                <th className="px-3 py-2 text-center font-semibold">Max</th>
                <th className="px-3 py-2 text-center font-semibold">Passing</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional (q1..qN) by design
                <tr key={i} className="odd:bg-card even:bg-surface-low">
                  <td className="px-3 py-2 font-mono text-on-surface-variant">
                    q{i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.label}
                      onChange={(e) => patch(i, "label", e.target.value)}
                      className="w-24 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.topics}
                      onChange={(e) => patch(i, "topics", e.target.value)}
                      className="w-full min-w-48 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => patch(i, "date", e.target.value)}
                      className="rounded border border-outline-variant/60 bg-surface px-2 py-1 text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min={1}
                      value={row.maxScore}
                      onChange={(e) => patch(i, "maxScore", e.target.value)}
                      className="w-16 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      value={row.passing}
                      onChange={(e) => patch(i, "passing", e.target.value)}
                      className="w-16 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      title="Remove quiz"
                      disabled={rows.length <= 1}
                      onClick={() =>
                        setRows((r) => r.filter((_, j) => j !== i))
                      }
                      className="rounded p-1 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setRows((r) => [
              ...r,
              {
                label: `Q${r.length + 1}`,
                maxScore: "100",
                passing: "50",
                topics: "",
                date: "",
              },
            ])
          }
        >
          <Plus aria-hidden /> Add quiz
        </Button>
        <p className="text-xs text-on-surface-variant">
          Grade entry, the student detail, and the SJE rollup follow this set.
          Entered scores are never modified by definition changes.
        </p>
      </CardContent>

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Save quiz definitions?"
        description={`${gradedStudentCount} student(s) in this batch already have quiz grades. Their raw scores stay exactly as entered — pass/fail marks and the SJE percentage recompute against the new definitions.`}
        confirmLabel="Save"
        tone="primary"
        pending={pending}
        onConfirm={() => {
          setConfirmSave(false);
          save();
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Use the standard quiz set?"
        description="Removes this batch's custom definitions and returns to the standard q1–q10 set. Entered scores are kept."
        confirmLabel="Use standard set"
        tone="primary"
        pending={pending}
        onConfirm={() => {
          setConfirmReset(false);
          resetToDefaults();
        }}
      />
    </Card>
  );
}
