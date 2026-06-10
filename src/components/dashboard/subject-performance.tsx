"use client";

import { useState } from "react";
import {
  type GraduateRecord,
  SUBJECTS,
  type SubjectAnalytics,
  type SubjectKey,
} from "@/lib/subject-meta";
import { cn } from "@/lib/utils";

const SHORT = new Map(SUBJECTS.map((s) => [s.key, s.short]));

/**
 * Score band for a 0–100 value (proficiency % or Total Evaluation):
 *   90+ International standard · 85+ Local standard · 75+ Passed ·
 *   70+ Struggling (still passing) · below 70 Failed. Pass mark = 70.
 */
function band(v: number | null): string {
  if (v == null) return "bg-surface-low text-on-surface-variant/50";
  if (v >= 90) return "bg-success/30 text-success";
  if (v >= 85) return "bg-success/15 text-success";
  if (v >= 75) return "bg-accent/12 text-accent";
  if (v >= 70) return "bg-warning/18 text-warning";
  return "bg-secondary/15 text-secondary";
}

const batchName = (batchNo: number | null, batch: string) =>
  batchNo ? `Batch ${batchNo}` : batch;

function HeatCell({ pct }: { pct: number | null }) {
  return (
    <td className="p-0.5">
      <div
        className={cn(
          "tabular rounded-md py-1.5 text-center text-xs font-semibold",
          band(pct),
        )}
        title={pct == null ? "no score" : `${pct}%`}
      >
        {pct == null ? "—" : Math.round(pct)}
      </div>
    </td>
  );
}

export function SubjectPerformance({ data }: { data: SubjectAnalytics }) {
  const [scope, setScope] = useState("__global__");
  const [outlierBy, setOutlierBy] = useState<"total" | SubjectKey>("total");

  if (data.graduateCount === 0) {
    return (
      <p className="flex h-[180px] items-center justify-center px-6 text-center text-sm text-on-surface-variant">
        No graduate scores recorded yet. Once batches graduate with proficiency
        scores, their subject strengths and weak spots show up here.
      </p>
    );
  }

  const isGlobal = scope === "__global__";
  const batch = isGlobal
    ? null
    : (data.batches.find((b) => b.batch === scope) ?? null);

  // Heatmap rows: batches (global view) or the batch's graduates (scoped view).
  type Row = {
    id: string;
    label: string;
    sub: Record<SubjectKey, number | null>;
    total: number | null;
  };
  const rows: Row[] = isGlobal
    ? data.batches.map((b) => ({
        id: b.batch,
        label: batchName(b.batchNo, b.batch),
        sub: Object.fromEntries(
          SUBJECTS.map((s) => [s.key, b.subjects[s.key].avg]),
        ) as Record<SubjectKey, number | null>,
        total: b.total,
      }))
    : data.graduates
        .filter((g) => g.batch === scope)
        .sort((a, b) => b.total - a.total)
        .map((g) => ({ id: g.id, label: g.name, sub: g.pct, total: g.total }));

  const scopeGrads = isGlobal
    ? data.graduates
    : data.graduates.filter((g) => g.batch === scope);
  const ov = (g: GraduateRecord) =>
    outlierBy === "total" ? g.total : (g.pct[outlierBy] ?? -1);
  const byMetric = [...scopeGrads].sort((a, b) => ov(b) - ov(a));
  const top = byMetric.slice(0, 3);
  const bottom = byMetric.length > 3 ? byMetric.slice(-3).reverse() : [];
  const outlierLabel =
    outlierBy === "total" ? "Total eval" : `${SHORT.get(outlierBy)} %`;
  const scopeAvg = scopeGrads.length
    ? Math.round(
        (scopeGrads.reduce((s, g) => s + g.total, 0) / scopeGrads.length) * 10,
      ) / 10
    : null;
  const scopePass = scopeGrads.length
    ? Math.round(
        (scopeGrads.filter((g) => g.total >= 70).length / scopeGrads.length) *
          100,
      )
    : null;

  // Fix the name column to the longest label across ALL scopes (so it never
  // shifts when filtering) plus padding for any future longer name.
  const longestName = Math.max(
    "All graduates".length,
    ...data.batches.map((b) => batchName(b.batchNo, b.batch).length),
    ...data.graduates.map((g) => g.name.length),
  );
  const nameWidth = Math.min(340, longestName * 8 + 32);

  return (
    <div className="space-y-5">
      {/* ── Summary (left) + scope filter (right) on one row ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-on-surface-variant">
          {isGlobal ? (
            <>
              <span className="font-medium text-on-surface">
                {scopeGrads.length}
              </span>{" "}
              graduates across {data.batches.length} batches
            </>
          ) : (
            <>
              <span className="font-medium text-on-surface">
                {batch ? batchName(batch.batchNo, batch.batch) : scope}
              </span>{" "}
              — each row is a graduate
            </>
          )}
          {scopeAvg != null && ` · avg total ${scopeAvg}`}
          {scopePass != null && ` · ${scopePass}% passed`}
        </p>

        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-on-surface">
          View
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="h-9 rounded border border-outline-variant bg-card px-2 text-sm text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="__global__">All graduates</option>
            {data.batches.map((b) => (
              <option key={b.batch} value={b.batch}>
                {b.batchNo ? `Batch ${b.batchNo}` : b.batch} ({b.count})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Heatmap ── */}
      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
          style={{ minWidth: nameWidth + 7 * 44 }}
        >
          <colgroup>
            <col style={{ width: nameWidth }} />
            {SUBJECTS.map((s) => (
              <col key={s.key} />
            ))}
            <col />
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card pr-3 pb-2 text-left text-xs font-semibold text-on-surface-variant">
                {isGlobal ? "Batch" : "Graduate"}
              </th>
              {SUBJECTS.map((s) => (
                <th
                  key={s.key}
                  title={s.label}
                  className="px-0.5 pb-2 text-center text-xs font-semibold text-on-surface-variant"
                >
                  {s.short}
                </th>
              ))}
              <th className="px-0.5 pb-2 text-center text-xs font-semibold text-on-surface-variant">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Global benchmark row */}
            <tr>
              <td className="sticky left-0 z-10 bg-card py-0.5 pr-3 text-xs font-semibold text-on-surface">
                All graduates
              </td>
              {SUBJECTS.map((s) => {
                const g = data.global.find((x) => x.key === s.key);
                return <HeatCell key={s.key} pct={g?.avg ?? null} />;
              })}
              <td className="p-0.5">
                <div
                  className={cn(
                    "tabular rounded-md py-1.5 text-center text-xs font-bold",
                    band(data.avgTotal),
                  )}
                >
                  {data.avgTotal != null ? Math.round(data.avgTotal) : "—"}
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={SUBJECTS.length + 2} className="py-1">
                <div className="h-px bg-outline-variant/50" />
              </td>
            </tr>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="sticky left-0 z-10 truncate bg-card py-0.5 pr-3 text-xs font-medium uppercase text-on-surface">
                  {r.label}
                </td>
                {SUBJECTS.map((s) => (
                  <HeatCell key={s.key} pct={r.sub[s.key]} />
                ))}
                <td className="p-0.5">
                  <div
                    className={cn(
                      "tabular rounded-md py-1.5 text-center text-xs font-bold",
                      band(r.total),
                    )}
                  >
                    {r.total != null ? Math.round(r.total) : "—"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
        <span>Score bands (pass mark 70):</span>
        <Swatch className="bg-secondary/40" label="Below 70 · Failed" />
        <Swatch className="bg-warning/50" label="70–74 · Struggling" />
        <Swatch className="bg-accent/40" label="75–84 · Passed" />
        <Swatch className="bg-success/40" label="85–89 · Local standard" />
        <Swatch
          className="bg-success/70"
          label="90+ · International standard"
        />
      </div>

      {/* ── Outliers (by overall total or a single exam) ── */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-on-surface">
            Outliers
          </span>
          <label className="flex items-center gap-2 text-xs text-on-surface-variant">
            Ranked by
            <select
              value={outlierBy}
              onChange={(e) =>
                setOutlierBy(e.target.value as "total" | SubjectKey)
              }
              className="h-8 rounded border border-outline-variant bg-card px-2 text-xs text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="total">Overall total</option>
              {SUBJECTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <OutlierList
            title="Top performers"
            tone="success"
            rows={top}
            showBatch={isGlobal}
            valueFn={ov}
            valueLabel={outlierLabel}
          />
          {bottom.length > 0 && (
            <OutlierList
              title="Worst performers"
              tone="warning"
              rows={bottom}
              showBatch={isGlobal}
              valueFn={ov}
              valueLabel={outlierLabel}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", className)} />
      {label}
    </span>
  );
}

function OutlierList({
  title,
  tone,
  rows,
  showBatch,
  valueFn,
  valueLabel,
}: {
  title: string;
  tone: "success" | "warning";
  rows: GraduateRecord[];
  showBatch: boolean;
  valueFn: (g: GraduateRecord) => number;
  valueLabel: string;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-low p-3">
      <h4
        className={cn(
          "mb-2 text-xs font-semibold uppercase tracking-wide",
          tone === "success" ? "text-success" : "text-warning",
        )}
      >
        {title}
      </h4>
      <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
        <span className="flex-1">Graduate</span>
        <span className="w-16 text-right">{valueLabel}</span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((g) => (
          <li key={g.id} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate uppercase text-on-surface">
              {g.name}
              {showBatch && g.batchNo && (
                <span className="ml-1 text-xs text-on-surface-variant">
                  · B{g.batchNo}
                </span>
              )}
            </span>
            <span className="tabular w-16 shrink-0 text-right font-bold text-on-surface">
              {Math.round(valueFn(g))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
