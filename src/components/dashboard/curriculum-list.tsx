"use client";

import { ArrowDown, ArrowUp, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteItem,
  deleteModule,
  moveItem,
  moveModule,
} from "@/app/dashboard/courses/actions";
import { ConfirmActionDialog } from "@/components/dashboard/confirm-action-dialog";
import {
  ItemTypeIcon,
  type ItemValues,
  ModuleItemDialog,
} from "@/components/dashboard/module-item-dialog";
import { ModuleSettingsDialog } from "@/components/dashboard/module-settings-dialog";
import {
  ItemPublishToggle,
  ModulePublishMenu,
} from "@/components/dashboard/publish-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const REQ_LABEL: Record<string, string> = {
  NONE: "Optional",
  MUST_VIEW: "View",
  MUST_MARK_DONE: "Mark done",
  MUST_PASS: "Pass",
};

export type CurriculumItem = ItemValues & { contentId: string | null };

export type CurriculumModule = {
  id: string;
  title: string;
  state: string;
  requireSequentialProgress: boolean;
  requirementCount: string;
  prerequisiteModuleIds: string[];
  unlockAt: string | null;
  items: CurriculumItem[];
};

type MoveAction =
  | { kind: "module"; id: string; dir: "up" | "down" }
  | { kind: "item"; moduleId: string; id: string; dir: "up" | "down" };

function swapped<T>(arr: T[], i: number, j: number): T[] {
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function applyMoveAction(
  state: CurriculumModule[],
  action: MoveAction,
): CurriculumModule[] {
  if (action.kind === "module") {
    const i = state.findIndex((m) => m.id === action.id);
    const j = action.dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= state.length) return state;
    return swapped(state, i, j);
  }
  return state.map((m) => {
    if (m.id !== action.moduleId) return m;
    const i = m.items.findIndex((it) => it.id === action.id);
    const j = action.dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= m.items.length) return m;
    return { ...m, items: swapped(m.items, i, j) };
  });
}

/**
 * Curriculum editor list with optimistic reorder (R7): a move renders
 * immediately, the affected row shows a pending spinner and disables its
 * controls, and a server failure reverts the order with a visible error.
 */
export function CurriculumList({
  courseId,
  modules,
}: {
  courseId: string;
  modules: CurriculumModule[];
}) {
  const [optimisticModules, applyMove] = useOptimistic(
    modules,
    applyMoveAction,
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function move(action: MoveAction) {
    const key = `${action.kind}:${action.id}`;
    startTransition(async () => {
      applyMove(action);
      setPendingKey(key);
      try {
        const fd = new FormData();
        fd.set("id", action.id);
        fd.set("courseId", courseId);
        fd.set("dir", action.dir);
        if (action.kind === "module") {
          await moveModule(fd);
        } else {
          fd.set("moduleId", action.moduleId);
          await moveItem(fd);
        }
      } catch {
        toast.error("Couldn't save the new order — reverted.");
      } finally {
        setPendingKey(null);
      }
    });
  }

  const moduleList = optimisticModules.map((m) => ({
    id: m.id,
    title: m.title,
  }));

  return (
    <>
      {optimisticModules.map((module, mi) => {
        const moduleKey = `module:${module.id}`;
        return (
          <Card key={module.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MoveControls
                    pending={pendingKey === moduleKey}
                    disableUp={mi === 0 || pendingKey != null}
                    disableDown={
                      mi === optimisticModules.length - 1 || pendingKey != null
                    }
                    onMove={(dir) =>
                      move({ kind: "module", id: module.id, dir })
                    }
                  />
                  <h3 className="font-semibold text-on-surface">
                    {module.title}
                  </h3>
                  {module.requireSequentialProgress && (
                    <Badge variant="neutral">Sequential</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <ModulePublishMenu
                    moduleId={module.id}
                    courseId={courseId}
                    title={module.title}
                    published={module.state === "PUBLISHED"}
                  />
                  <ModuleSettingsDialog
                    courseId={courseId}
                    module={{
                      id: module.id,
                      title: module.title,
                      state: module.state,
                      requireSequentialProgress:
                        module.requireSequentialProgress,
                      requirementCount: module.requirementCount,
                      prerequisiteModuleIds: module.prerequisiteModuleIds,
                      unlockAt: module.unlockAt,
                    }}
                    otherModules={moduleList.filter((m) => m.id !== module.id)}
                  />
                  <ConfirmActionDialog
                    trigger={
                      <button
                        type="button"
                        title="Delete module"
                        className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    }
                    title={`Delete module “${module.title}”?`}
                    description="The module and its items disappear from the course for everyone."
                    consequences={[
                      `${module.items.length} item${module.items.length === 1 ? "" : "s"} go with it`,
                      "Graduate progress records are kept for CE history",
                    ]}
                    confirmLabel="Delete module"
                    action={deleteModule}
                    fields={{ id: module.id, courseId }}
                  />
                </div>
              </div>

              <ul className="divide-y divide-outline-variant/40 rounded border border-outline-variant/40 bg-surface-low/40 dark:bg-white/[0.02]">
                {module.items.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-on-surface-variant">
                    No items yet.
                  </li>
                ) : (
                  module.items.map((item, ii) => {
                    const itemKey = `item:${item.id}`;
                    const editorHref =
                      item.type === "PAGE"
                        ? `/dashboard/courses/${courseId}/pages/${item.contentId}`
                        : item.type === "QUIZ"
                          ? `/dashboard/courses/${courseId}/quizzes/${item.contentId}`
                          : null;
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm text-on-surface">
                          <MoveControls
                            pending={pendingKey === itemKey}
                            disableUp={ii === 0 || pendingKey != null}
                            disableDown={
                              ii === module.items.length - 1 ||
                              pendingKey != null
                            }
                            onMove={(dir) =>
                              move({
                                kind: "item",
                                moduleId: module.id,
                                id: item.id,
                                dir,
                              })
                            }
                          />
                          <ItemTypeIcon type={item.type} />
                          <span className="truncate">{item.title}</span>
                          <Badge variant="neutral">
                            {REQ_LABEL[item.completionRequirement]}
                          </Badge>
                        </span>
                        <span className="flex items-center gap-1">
                          <ItemPublishToggle
                            itemId={item.id}
                            courseId={courseId}
                            title={item.title}
                            published={item.state === "PUBLISHED"}
                          />
                          {editorHref && (
                            <Link
                              href={editorHref}
                              title="Open editor"
                              className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <Pencil className="size-4" />
                            </Link>
                          )}
                          <ModuleItemDialog
                            courseId={courseId}
                            moduleId={module.id}
                            item={{
                              id: item.id,
                              title: item.title,
                              type: item.type,
                              url: item.url,
                              indent: item.indent,
                              state: item.state,
                              completionRequirement: item.completionRequirement,
                              minScore: item.minScore,
                              estimatedMins: item.estimatedMins,
                            }}
                          />
                          <ConfirmActionDialog
                            trigger={
                              <button
                                type="button"
                                title="Delete item"
                                className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            }
                            title={`Delete item “${item.title}”?`}
                            description="The item disappears from the course for everyone."
                            consequences={
                              item.type === "PAGE" || item.type === "QUIZ"
                                ? [
                                    `Its ${item.type === "PAGE" ? "page content" : "quiz and questions"} are hidden with it`,
                                    "Graduate progress records are kept for CE history",
                                  ]
                                : [
                                    "Graduate progress records are kept for CE history",
                                  ]
                            }
                            confirmLabel="Delete item"
                            action={deleteItem}
                            fields={{ id: item.id, courseId }}
                          />
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>

              <ModuleItemDialog courseId={courseId} moduleId={module.id} />
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}

function MoveControls({
  pending,
  disableUp,
  disableDown,
  onMove,
}: {
  pending: boolean;
  disableUp: boolean;
  disableDown: boolean;
  onMove: (dir: "up" | "down") => void;
}) {
  if (pending) {
    return (
      <span
        className="flex w-[18px] items-center justify-center py-1"
        title="Saving order…"
      >
        <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden />
        <span className="sr-only">Saving order…</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col">
      <button
        type="button"
        title="Move up"
        disabled={disableUp}
        onClick={() => onMove("up")}
        className="block rounded p-0.5 text-on-surface-variant hover:bg-surface-container hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-30"
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        title="Move down"
        disabled={disableDown}
        onClick={() => onMove("down")}
        className="block rounded p-0.5 text-on-surface-variant hover:bg-surface-container hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-30"
      >
        <ArrowDown className="size-3.5" />
      </button>
    </span>
  );
}
