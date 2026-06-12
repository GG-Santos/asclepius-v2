"use client";

import { useMemo, useState } from "react";
import {
  computeSchemeResult,
  type GradingScheme,
  isComponentPassing,
  type SchemeCategory,
} from "@/lib/assessment-scheme";

/**
 * Scheme-driven grade entry (R2, R6, R8): split sub-scores render as
 * separate inputs grouped under their canonical category; bonus fields per
 * the batch's mode; live total + verdict preview. Inputs post as
 * `comp:<key>` so the server stores them under component keys.
 */
export function SchemeGradeEntry({
  scheme,
  defaults,
  defaultBonus,
  defaultBonusNote,
}: {
  scheme: GradingScheme;
  defaults: Record<string, string>;
  defaultBonus: string;
  defaultBonusNote: string;
}) {
  const [scores, setScores] = useState<Record<string, string>>({
    ...defaults,
  });
  const [bonus, setBonus] = useState(defaultBonus);

  const result = useMemo(() => {
    const parsed: Record<string, number | null> = {};
    for (const c of scheme.components) {
      const raw = scores[c.key] ?? "";
      const n = Number.parseFloat(raw);
      parsed[c.key] = raw !== "" && !Number.isNaN(n) ? n : null;
    }
    const b = Number.parseFloat(bonus);
    return computeSchemeResult(
      scheme,
      parsed,
      !Number.isNaN(b) && bonus !== "" ? b : null,
    );
  }, [scheme, scores, bonus]);

  return (
    <div className="space-y-5">
      {scheme.categories.map((category) => (
        <CategorySection
          key={category.key}
          category={category}
          scheme={scheme}
          scores={scores}
          onChange={(key, value) => setScores((s) => ({ ...s, [key]: value }))}
        />
      ))}

      {/* Bonus (R6) */}
      <div className="rounded-md border border-outline-variant/60 p-3">
        <p className="mb-2 text-xs font-semibold text-on-surface">
          Bonus points
          <span className="ml-2 font-normal text-on-surface-variant">
            {scheme.mode === "total-points"
              ? "added to the point total before the pass check"
              : "signed; its own line in the total — not part of any category"}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            name="bonusPoints"
            step="0.01"
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            placeholder="0"
            className="w-24 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="text"
            name="bonusNote"
            defaultValue={defaultBonusNote}
            placeholder="Reason (optional)"
            maxLength={200}
            className="min-w-60 flex-1 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {result.bonusApplied !== 0 && (
            <span className="text-xs text-success">
              {result.bonusApplied > 0
                ? `+${result.bonusApplied}`
                : result.bonusApplied}{" "}
              applied
            </span>
          )}
        </div>
      </div>

      {/* Live result */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-outline-variant/60 bg-surface-highest px-4 py-3 text-sm">
        <span className="font-semibold text-on-surface">
          {scheme.mode === "total-points"
            ? `Total: ${result.total ?? "—"} / ${result.totalMax}`
            : `Total Evaluation: ${result.total ?? "—"} / 100`}
        </span>
        <span className="text-on-surface-variant">
          passing {result.passingTotal}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
            result.verdict === "pass"
              ? "bg-success/15 text-success"
              : result.verdict === "fail"
                ? "bg-error/15 text-error"
                : "bg-surface-container text-on-surface-variant"
          }`}
        >
          {result.verdict}
        </span>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  scheme,
  scores,
  onChange,
}: {
  category: SchemeCategory;
  scheme: GradingScheme;
  scores: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const components = scheme.components.filter((c) => c.group === category.key);
  const max = components.reduce((s, c) => s + c.maxScore, 0);
  let sum = 0;
  let any = false;
  for (const c of components) {
    const n = Number.parseFloat(scores[c.key] ?? "");
    if (!Number.isNaN(n)) {
      sum += n;
      any = true;
    }
  }
  return (
    <div className="rounded-md border border-outline-variant/60">
      <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container px-3 py-2">
        <span className="text-xs font-semibold text-on-surface">
          {category.label}
          <span className="ml-1 font-normal text-on-surface-variant">
            ({category.weight}%)
          </span>
        </span>
        <span className="font-mono text-xs text-on-surface-variant">
          {any ? sum : "—"} / {max}
        </span>
      </div>
      <div className="divide-y divide-outline-variant/30">
        {components.map((c) => {
          const raw = scores[c.key] ?? "";
          const n = Number.parseFloat(raw);
          const entered = raw !== "" && !Number.isNaN(n);
          const pass = entered ? isComponentPassing(c, n) : null;
          return (
            <div
              key={c.key}
              className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
            >
              <span className="min-w-0">
                <span className="block font-medium text-on-surface">
                  {c.label}
                </span>
                {c.date && (
                  <span className="block text-[10px] text-on-surface-variant">
                    {c.date}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {pass !== null && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      pass
                        ? "bg-success/15 text-success"
                        : "bg-error/15 text-error"
                    }`}
                  >
                    {pass ? "PASS" : "FAIL"}
                  </span>
                )}
                <input
                  type="number"
                  name={`comp:${c.key}`}
                  min={0}
                  max={c.maxScore}
                  step="any"
                  value={raw}
                  onChange={(e) => onChange(c.key, e.target.value)}
                  placeholder="—"
                  className="w-20 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <span className="w-12 text-right text-on-surface-variant">
                  / {c.maxScore}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
