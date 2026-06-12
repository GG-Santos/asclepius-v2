"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBatchProficiencyRows } from "@/app/dashboard/batches/actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SCORE_ROWS, type ScoreKey, type ScoreRow } from "@/lib/graduate";

type Row = {
  id: string;
  key: ScoreKey;
  weight: string;
  label: string;
};

type RowField = "key" | "weight" | "label";

let rowSeq = 0;
function freshRowId(): string {
  rowSeq += 1;
  return `proficiency-row-${rowSeq}`;
}

const SCORE_OPTIONS = SCORE_ROWS.map((row) => ({
  key: row.key,
  label: row.label,
}));

function toRows(rows: readonly ScoreRow[]): Row[] {
  return rows.map((row) => ({
    id: freshRowId(),
    key: row.key,
    weight: row.weight,
    label: row.label,
  }));
}

export function BatchProficiencyRowsEditor({
  batchId,
  initialRows,
  hasCustomRows,
}: {
  batchId: string;
  initialRows: ScoreRow[];
  hasCustomRows: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => toRows(initialRows));
  const [pending, startTransition] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);

  function patch(i: number, field: RowField, value: string) {
    setRows((existing) =>
      existing.map((row, j) => {
        if (j !== i) return row;
        if (field === "key") return { ...row, key: value as ScoreKey };
        return { ...row, [field]: value };
      }),
    );
  }

  function save() {
    const seen = new Set<ScoreKey>();
    const payload = rows.map((row) => ({
      key: row.key,
      weight: row.weight.trim(),
      label: row.label.trim(),
    }));
    for (const row of payload) {
      if (!row.weight || !row.label) {
        toast.error("Each category needs a label and displayed weight.");
        return;
      }
      if (seen.has(row.key)) {
        toast.error("Each score field can only appear once.");
        return;
      }
      seen.add(row.key);
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", batchId);
      fd.set("proficiencyRows", JSON.stringify(payload));
      const result = await updateBatchProficiencyRows({}, fd);
      if (result.ok) {
        toast.success("Proficiency categories saved.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not save proficiency categories.");
      }
    });
  }

  function reset() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", batchId);
      fd.set("proficiencyRows", "null");
      const result = await updateBatchProficiencyRows({}, fd);
      if (result.ok) {
        setRows(toRows(SCORE_ROWS));
        toast.success("Proficiency categories reset.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not reset proficiency categories.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">
          Proficiency categories
          <span className="ml-2 text-xs font-normal text-on-surface-variant">
            {hasCustomRows ? "custom for this batch" : "standard set"}
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {hasCustomRows && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw aria-hidden /> Reset
            </Button>
          )}
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            Save categories
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-md border border-outline-variant/60">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-3 py-2 font-semibold">Score field</th>
                <th className="px-3 py-2 text-center font-semibold">Weight</th>
                <th className="px-3 py-2 font-semibold">Category label</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="odd:bg-card even:bg-surface-low">
                  <td className="px-3 py-2">
                    <select
                      value={row.key}
                      onChange={(e) =>
                        patch(i, "key", e.target.value as ScoreKey)
                      }
                      className="rounded border border-outline-variant/60 bg-surface px-2 py-1 text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {SCORE_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.key} — {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      value={row.weight}
                      onChange={(e) => patch(i, "weight", e.target.value)}
                      placeholder="15%"
                      className="w-24 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.label}
                      onChange={(e) => patch(i, "label", e.target.value)}
                      placeholder="Situational Judgement"
                      className="w-full min-w-60 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      title="Remove category"
                      disabled={rows.length <= 1}
                      onClick={() =>
                        setRows((existing) =>
                          existing.filter((_, j) => j !== i),
                        )
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
          disabled={rows.length >= SCORE_OPTIONS.length}
          onClick={() => {
            const used = new Set(rows.map((row) => row.key));
            const next =
              SCORE_OPTIONS.find((option) => !used.has(option.key)) ??
              SCORE_OPTIONS[0];
            if (!next) return;
            setRows((existing) => [
              ...existing,
              {
                id: freshRowId(),
                key: next.key,
                weight: "0%",
                label: next.label,
              },
            ]);
          }}
        >
          <Plus aria-hidden /> Add category
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset proficiency categories?"
        description="This batch will use the standard certificate category labels again. Saved graduate scores and rankings stay unchanged."
        confirmLabel="Reset"
        tone="primary"
        pending={pending}
        onConfirm={() => {
          setConfirmReset(false);
          reset();
        }}
      />
    </Card>
  );
}
