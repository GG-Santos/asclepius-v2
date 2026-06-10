"use client";

import { useState } from "react";
import {
  type ActivityResult,
  activityLeaderboard,
  medalFor,
} from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; activities: ActivityResult[] };

/** Pick a quiz/activity → the batch ranked for it (the per-activity leaderboard). */
export function BatchLeaderboard({
  cohort,
  highlightId,
}: {
  cohort: Member[];
  highlightId?: string;
}) {
  const activities =
    cohort[0]?.activities.map((a) => ({
      key: a.key,
      label: a.label,
    })) ?? [];
  const [key, setKey] = useState(activities[0]?.key ?? "");

  if (activities.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-on-surface-variant">
        No cohort to rank yet.
      </p>
    );
  }

  const board = activityLeaderboard(cohort, key);
  const nameById = new Map(cohort.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor="lb-activity"
          className="text-sm text-on-surface-variant"
        >
          Activity
        </label>
        <select
          id="lb-activity"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="h-9 rounded border border-outline-variant bg-card px-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {activities.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {board.length === 0 ? (
        <p className="py-4 text-center text-sm text-on-surface-variant">
          No scores recorded for this activity yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-outline-variant/60">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-3 py-2 font-semibold">Rank</th>
                <th className="px-3 py-2 font-semibold">Student</th>
                <th className="px-3 py-2 text-center font-semibold">Score</th>
                <th className="px-3 py-2 text-center font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "odd:bg-card even:bg-surface-low",
                    r.id === highlightId && "bg-accent/10",
                  )}
                >
                  <td className="tabular px-3 py-2 font-medium text-on-surface-variant">
                    {medalFor(r.rank) ?? ""} #{r.rank}
                  </td>
                  <td className="px-3 py-2 font-medium text-on-surface">
                    {nameById.get(r.id) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center font-mono">
                    {r.score}
                    {r.pct != null ? ` (${r.pct}%)` : ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.passed == null ? (
                      "—"
                    ) : (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          r.passed
                            ? "bg-success/15 text-success"
                            : "bg-error/15 text-error",
                        )}
                      >
                        {r.passed ? "Pass" : "Fail"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
