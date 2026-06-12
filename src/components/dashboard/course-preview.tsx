"use client";

import {
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Lock,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ItemTypeIcon } from "@/components/dashboard/module-item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  isItemAvailable,
  isModuleComplete,
  isModuleUnlocked,
  progressRatio,
} from "@/lib/lms";

// Literal unions match the generated Prisma enums, so these rows feed the
// exact same lib/lms decision functions the portal uses — the simulation
// cannot drift from real graduate behavior.
export type PreviewItem = {
  id: string;
  title: string;
  type: string;
  completionRequirement: "NONE" | "MUST_VIEW" | "MUST_MARK_DONE" | "MUST_PASS";
  minScore: number | null;
  estimatedMins: number | null;
};

export type PreviewModule = {
  id: string;
  title: string;
  requireSequentialProgress: boolean;
  requirementCount: "ALL" | "ONE";
  prerequisiteModuleIds: string[];
  unlockAt: string | null; // ISO
  items: PreviewItem[];
};

const REQ_LABEL: Record<string, string> = {
  NONE: "Optional",
  MUST_VIEW: "View",
  MUST_MARK_DONE: "Mark done",
  MUST_PASS: "Pass",
};

/**
 * Zero-persistence rehearsal of the graduate experience: ticking an item
 * "done" recomputes module completion, prerequisite unlocks, and sequential
 * availability in the browser. No enrollment or progress is ever written.
 */
export function CoursePreview({ modules }: { modules: PreviewModule[] }) {
  const [doneIds, setDoneIds] = useState<ReadonlySet<string>>(new Set());

  const view = useMemo(() => {
    const isItemDone = (id: string) => doneIds.has(id);
    const completedModuleIds = new Set<string>();
    for (const m of modules) {
      if (isModuleComplete(m, m.items, isItemDone)) {
        completedModuleIds.add(m.id);
      }
    }
    const now = new Date();
    return modules.map((m) => {
      const unlocked = isModuleUnlocked(
        {
          prerequisiteModuleIds: m.prerequisiteModuleIds,
          unlockAt: m.unlockAt ? new Date(m.unlockAt) : null,
        },
        completedModuleIds,
        now,
      );
      return {
        ...m,
        unlocked,
        complete: completedModuleIds.has(m.id),
        items: m.items.map((item, index) => ({
          ...item,
          done: isItemDone(item.id),
          available: unlocked && isItemAvailable(m, m.items, index, isItemDone),
        })),
      };
    });
  }, [modules, doneIds]);

  const totalItems = modules.reduce((s, m) => s + m.items.length, 0);
  const doneItems = doneIds.size;

  function toggle(id: string) {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (totalItems === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-on-surface-variant">
          Nothing to preview yet — graduates only see published modules
          containing published items.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-on-surface">
              <Eye className="size-4 text-accent" aria-hidden />
              Simulation — you're seeing this as a brand-new graduate. Nothing
              is saved.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDoneIds(new Set())}
              disabled={doneItems === 0}
            >
              <RotateCcw aria-hidden /> Reset
            </Button>
          </div>
          <Progress value={progressRatio(doneItems, totalItems) * 100} />
          <p className="text-xs text-on-surface-variant">
            {doneItems}/{totalItems} items ticked. Tick items to watch
            prerequisites and sequential locks open exactly as they would for a
            graduate.
          </p>
        </CardContent>
      </Card>

      {view.map((module, mi) => (
        <div key={module.id} className="space-y-2">
          <h2 className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-data-mono text-primary dark:bg-accent/10 dark:text-accent">
              {mi + 1}
            </span>
            <span className="text-title-md text-on-surface">
              {module.title}
            </span>
            {module.complete ? (
              <Badge variant="verified">Done</Badge>
            ) : !module.unlocked ? (
              <Badge variant="neutral">
                <Lock className="size-3" /> Locked
              </Badge>
            ) : null}
          </h2>
          <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-lg border border-outline-variant/60 bg-card">
            {module.items.map((item) => {
              const reachable = item.available || item.done;
              return (
                <li
                  key={item.id}
                  className={`flex items-center justify-between gap-2 px-4 py-3 ${reachable ? "" : "opacity-60"}`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      disabled={!reachable}
                      title={
                        reachable
                          ? item.done
                            ? "Untick (undo simulated completion)"
                            : "Tick as completed in the simulation"
                          : "Locked for graduates at this point"
                      }
                      aria-label={`${item.title}, ${item.done ? "completed" : item.available ? "available" : "locked"} in simulation`}
                      className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed"
                    >
                      {item.done ? (
                        <CheckCircle2
                          className="size-5 shrink-0 text-accent"
                          aria-hidden
                        />
                      ) : !item.available ? (
                        <Lock
                          className="size-4 shrink-0 text-on-surface-variant/50"
                          aria-hidden
                        />
                      ) : (
                        <Circle
                          className="size-5 shrink-0 text-on-surface-variant/50"
                          aria-hidden
                        />
                      )}
                    </button>
                    <ItemTypeIcon type={item.type} />
                    <span className="truncate text-sm text-on-surface">
                      {item.title}
                    </span>
                    <Badge variant="neutral">
                      {REQ_LABEL[item.completionRequirement]}
                    </Badge>
                  </span>
                  {item.estimatedMins ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-on-surface-variant">
                      <Clock className="size-3.5" />
                      {item.estimatedMins} min
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
