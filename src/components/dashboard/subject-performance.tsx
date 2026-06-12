"use client";

import { useMemo, useState } from "react";
import {
  batchSubjectRows,
  type CohortRecord,
  type CredentialFilter,
  DEFAULT_SUBJECT_FILTERS,
  filterCohort,
  SUBJECTS,
  type SubjectAnalytics,
  type SubjectKey,
  subjectStats,
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

const selectClass =
  "h-9 rounded border border-outline-variant bg-card px-2 text-sm text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function SubjectPerformance({ data }: { data: SubjectAnalytics }) {
  const [scope, setScope] = useState("__global__");
  const [includeFailed, setIncludeFailed] = useState(
    DEFAULT_SUBJECT_FILTERS.includeFailed,
  );
  const [credential, setCredential] = useState<CredentialFilter>(
    DEFAULT_SUBJECT_FILTERS.credential,
  );
  const [outlierBy, setOutlierBy] = useState<"total" | SubjectKey>("total");

  // Filters → filtered records → aggregates, all client-side and live.
  const filtered = useMemo(
    () => filterCohort(data.records, { includeFailed, credential }),
    [data.records, includeFailed, credential],
  );
  const ranked = useMemo(() => filtered.filter((r) => !r.legacy), [filtered]);
  const stats = useMemo(() => subjectStats(ranked), [ranked]);
  const batchRows = useMemo(
    () => batchSubjectRows(data.batches, filtered, stats.global),
    [data.batches, filtered, stats.global],
  );

  if (data.records.length === 0) {
    return (
      <p className="flex h-[180px] items-center justify-center px-6 text-center text-sm text-on-surface-variant">
        No cohort scores recorded yet. Once batches complete training with
        proficiency scores, their subject strengths and weak spots show up here.
      </p>
    );
  }

  const isGlobal = scope === "__global__";
  const batchRow = isGlobal
    ? null
    : (batchRows.find((b) => b.batch === scope) ?? null);

  // Heatmap rows: batches (global view) or the batch's cohort (scoped view).
  type Row = {
    id: string;
    label: string;
    title?: string;
    legacy: boolean;
    failed?: boolean;
    sub: Record<SubjectKey, number | null>;
    total: number | null;
  };
  const rows: Row[] = isGlobal
    ? batchRows.map((b) => ({
        id: b.batch,
        label: batchName(b.batchNo, b.batch),
        title: b.label ?? undefined,
        legacy: b.legacy,
        sub: Object.fromEntries(
          SUBJECTS.map((s) => [s.key, b.subjects[s.key].avg]),
        ) as Record<SubjectKey, number | null>,
        total: b.total,
      }))
    : filtered
        .filter((r) => r.batch === scope)
        .sort((a, b) => (b.total ?? -1) - (a.total ?? -1))
        .map((r) => ({
          id: r.id,
          label: r.name,
          legacy: r.legacy,
          failed: r.failed,
          sub: r.pct,
          total: r.total,
        }));

  // Benchmark row: the batch's own averages when scoped; global otherwise.
  const benchmark: Row = batchRow
    ? {
        id: "__benchmark__",
        label: batchName(batchRow.batchNo, batchRow.batch),
        title: batchRow.label ?? undefined,
        legacy: batchRow.legacy,
        sub: Object.fromEntries(
          SUBJECTS.map((s) => [s.key, batchRow.subjects[s.key].avg]),
        ) as Record<SubjectKey, number | null>,
        total: batchRow.total,
      }
    : {
        id: "__benchmark__",
        label: "All cohorts",
        legacy: false,
        sub: Object.fromEntries(
          stats.global.map((g) => [g.key, g.avg]),
        ) as Record<SubjectKey, number | null>,
        total: stats.avgTotal,
      };

  // Outliers rank cohort members — legacy-batch records never compete.
  const scopeRecords = isGlobal
    ? ranked
    : ranked.filter((r) => r.batch === scope);
  const ov = (r: CohortRecord) =>
    outlierBy === "total" ? (r.total ?? -1) : (r.pct[outlierBy] ?? -1);
  const byMetric = scopeRecords
    .filter((r) => ov(r) >= 0)
    .sort((a, b) => ov(b) - ov(a));
  const top = byMetric.slice(0, 3);
  const bottom = byMetric.length > 3 ? byMetric.slice(-3).reverse() : [];
  const outlierLabel =
    outlierBy === "total" ? "Total eval" : `${SHORT.get(outlierBy)} %`;
  const scopeTotals = scopeRecords
    .map((r) => r.total)
    .filter((t): t is number => t != null);
  const scopeAvg = scopeTotals.length
    ? Math.round(
        (scopeTotals.reduce((a, b) => a + b, 0) / scopeTotals.length) * 10,
      ) / 10
    : null;
  const shownCount = isGlobal
    ? filtered.length
    : filtered.filter((r) => r.batch === scope).length;
  // Pass rate is a cohort fact (passed ÷ completed) — filter-independent.
  const nonLegacy = data.batches.filter((b) => !b.legacy);
  const globalPassRate = nonLegacy.reduce((s, b) => s + b.count, 0)
    ? Math.round(
        (nonLegacy.reduce((s, b) => s + b.passed, 0) /
          nonLegacy.reduce((s, b) => s + b.count, 0)) *
          100,
      )
    : null;
  const scopePassRate = isGlobal
    ? globalPassRate
    : batchRow?.passRate != null
      ? Math.round(batchRow.passRate)
      : null;

  // Fix the name column to the longest label across ALL scopes (so it never
  // shifts when filtering) plus padding for any future longer name.
  const longestName = Math.max(
    "All cohorts".length,
    ...data.batches.map((b) => batchName(b.batchNo, b.batch).length),
    ...data.records.map((r) => r.name.length),
  );
  const nameWidth = Math.min(340, longestName * 8 + 32);

  return (
    <div className="space-y-5">
      {/* ── Summary (left) + filters (right) on one row ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-on-surface-variant">
          {isGlobal ? (
            <>
              <span className="font-medium text-on-surface">{shownCount}</span>{" "}
              {includeFailed ? "completed students" : "graduates"} shown across{" "}
              {batchRows.length} batches
            </>
          ) : (
            <>
              <span className="font-medium text-on-surface">
                {batchRow ? batchName(batchRow.batchNo, batchRow.batch) : scope}
              </span>
              {batchRow?.label && (
                <span className="text-on-surface-variant">
                  {" "}
                  · {batchRow.label}
                </span>
              )}{" "}
              — {batchRow?.passed ?? 0} passed · {batchRow?.failed ?? 0} failed
            </>
          )}
          {scopeAvg != null && ` · avg total ${scopeAvg}`}
          {scopePassRate != null && ` · ${scopePassRate}% pass rate`}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-on-surface">
            Students
            <select
              value={includeFailed ? "all" : "graduates"}
              onChange={(e) => setIncludeFailed(e.target.value === "all")}
              className={selectClass}
            >
              <option value="graduates">Graduates</option>
              <option value="all">Include failed</option>
            </select>
          </label>
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-on-surface">
            License
            <select
              value={credential}
              onChange={(e) =>
                setCredential(e.target.value as CredentialFilter)
              }
              className={selectClass}
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </label>
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-on-surface">
            View
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className={selectClass}
            >
              <option value="__global__">All batches</option>
              {data.batches.map((b) => (
                <option key={b.batch} value={b.batch}>
                  {b.batchNo ? `Batch ${b.batchNo}` : b.batch} ({b.count})
                  {b.legacy ? " · legacy" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
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
                {isGlobal ? "Batch" : "Student"}
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
            {/* Benchmark row: selected batch when scoped, all cohorts otherwise */}
            <tr>
              <td
                className="sticky left-0 z-10 bg-card py-0.5 pr-3 text-xs font-semibold text-on-surface"
                title={benchmark.title}
              >
                {benchmark.label}
              </td>
              {SUBJECTS.map((s) => (
                <HeatCell key={s.key} pct={benchmark.sub[s.key]} />
              ))}
              <td className="p-0.5">
                {benchmark.legacy ? (
                  <div
                    className="tabular rounded-md bg-surface-low py-1.5 text-center text-xs font-semibold text-on-surface-variant"
                    title="Legacy batch — no per-assessment grades on file; not ranked"
                  >
                    Legacy
                  </div>
                ) : (
                  <div
                    className={cn(
                      "tabular rounded-md py-1.5 text-center text-xs font-bold",
                      band(benchmark.total),
                    )}
                  >
                    {benchmark.total != null
                      ? Math.round(benchmark.total)
                      : "—"}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td colSpan={SUBJECTS.length + 2} className="py-1">
                <div className="h-px bg-outline-variant/50" />
              </td>
            </tr>
            {rows.map((r) => (
              <tr key={r.id}>
                <td
                  className="sticky left-0 z-10 truncate bg-card py-0.5 pr-3 text-xs font-medium uppercase text-on-surface"
                  title={r.title}
                >
                  {r.label}
                  {r.failed && (
                    <span className="ml-1.5 text-[10px] font-semibold normal-case text-secondary">
                      failed
                    </span>
                  )}
                </td>
                {SUBJECTS.map((s) => (
                  <HeatCell key={s.key} pct={r.sub[s.key]} />
                ))}
                <td className="p-0.5">
                  {r.legacy ? (
                    <div
                      className="tabular rounded-md bg-surface-low py-1.5 text-center text-xs font-semibold text-on-surface-variant"
                      title="Legacy batch — no per-assessment grades on file; not ranked"
                    >
                      Legacy
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "tabular rounded-md py-1.5 text-center text-xs font-bold",
                        band(r.total),
                      )}
                    >
                      {r.total != null ? Math.round(r.total) : "—"}
                    </div>
                  )}
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
  rows: CohortRecord[];
  showBatch: boolean;
  valueFn: (r: CohortRecord) => number;
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
        <span className="flex-1">Student</span>
        <span className="w-16 text-right">{valueLabel}</span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate uppercase text-on-surface">
              {r.name}
              {r.failed && (
                <span className="ml-1 text-xs font-semibold normal-case text-secondary">
                  · failed
                </span>
              )}
              {showBatch && r.batchNo && (
                <span className="ml-1 text-xs text-on-surface-variant">
                  · B{r.batchNo}
                </span>
              )}
            </span>
            <span className="tabular w-16 shrink-0 text-right font-bold text-on-surface">
              {Math.round(valueFn(r))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
