"use client";

import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { Fragment, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  archiveCourse,
  publishCourse,
  restoreCourse,
  setItemState,
  setModuleState,
  unpublishCourse,
} from "@/app/dashboard/courses/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Course lifecycle ─────────────────────────────────────────────────────────

type Transition = "publish" | "unpublish" | "archive" | "restore";

const TRANSITIONS: Record<
  Transition,
  {
    label: string;
    title: string;
    description: string;
    confirmLabel: string;
    action: (formData: FormData) => Promise<void>;
  }
> = {
  publish: {
    label: "Publish course…",
    title: "Publish this course?",
    description:
      "The course appears in the graduate portal and graduates can enroll immediately.",
    confirmLabel: "Publish course",
    action: publishCourse,
  },
  unpublish: {
    label: "Unpublish course…",
    title: "Unpublish this course?",
    description:
      "The course disappears from the graduate portal. Enrolled graduates keep their progress but lose access until you publish again.",
    confirmLabel: "Unpublish course",
    action: unpublishCourse,
  },
  archive: {
    label: "Archive course…",
    title: "Archive this course?",
    description:
      "Archiving retires the course: closed to new enrollment, while graduates who completed it keep review access and their certificates.",
    confirmLabel: "Archive course",
    action: archiveCourse,
  },
  restore: {
    label: "Restore to draft…",
    title: "Restore this course to draft?",
    description:
      "The course returns to draft for editing. It stays hidden from the portal until you publish it again.",
    confirmLabel: "Restore to draft",
    action: restoreCourse,
  },
};

const COURSE_STATE_META: Record<
  string,
  { label: string; transitions: Transition[] }
> = {
  UNPUBLISHED: { label: "Draft", transitions: ["publish", "archive"] },
  PUBLISHED: { label: "Published", transitions: ["unpublish", "archive"] },
  ARCHIVED: { label: "Archived", transitions: ["publish", "restore"] },
};

function ConfirmTransitionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}

/**
 * The one place a course changes lifecycle state. Current state reads as a
 * chip-style button; transitions are verb-first menu entries that always pass
 * through a confirmation dialog naming the consequences (Canvas offer/claim
 * events + publish coherence checks).
 */
export function CoursePublishControl({
  courseId,
  state,
  publishedItemCount,
  certificateEnabled,
  hasMustPassQuiz,
  activeEnrollments,
}: {
  courseId: string;
  state: string;
  publishedItemCount: number;
  certificateEnabled: boolean;
  hasMustPassQuiz: boolean;
  activeEnrollments: number;
}) {
  const [pendingTransition, setPendingTransition] = useState<Transition | null>(
    null,
  );
  const meta = COURSE_STATE_META[state];
  if (!meta) return null;

  const published = state === "PUBLISHED";
  const transition = pendingTransition ? TRANSITIONS[pendingTransition] : null;

  // Coherence warnings (Canvas wizard publish step + availability copy):
  // publishing stays possible — the dialog just tells the truth first.
  const warnings: string[] = [];
  if (pendingTransition === "publish") {
    if (publishedItemCount === 0)
      warnings.push(
        "No published items yet — graduates would see an empty course.",
      );
    if (certificateEnabled && !hasMustPassQuiz)
      warnings.push(
        "Certificates are enabled but no quiz requires a passing score — certificates would be issued without an assessment.",
      );
  }
  if (pendingTransition === "unpublish" && activeEnrollments > 0)
    warnings.push(
      `${activeEnrollments} graduate${activeEnrollments === 1 ? " is" : "s are"} currently enrolled and will lose access until republished.`,
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Course lifecycle options, currently ${meta.label.toLowerCase()}`}
          >
            {published ? (
              <CheckCircle2 className="size-4 text-success" aria-hidden />
            ) : state === "ARCHIVED" ? (
              <Archive className="size-4" aria-hidden />
            ) : (
              <Circle className="size-4 text-on-surface-variant" aria-hidden />
            )}
            {meta.label}
            <ChevronDown className="size-3.5 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {meta.transitions.map((t, i) => (
            <Fragment key={t}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => setPendingTransition(t)}>
                {t === "publish" ? (
                  <CheckCircle2 className="text-success" />
                ) : t === "unpublish" ? (
                  <Circle />
                ) : t === "archive" ? (
                  <Archive />
                ) : (
                  <Undo2 />
                )}
                {TRANSITIONS[t].label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={pendingTransition !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTransition(null);
        }}
      >
        <DialogContent className="max-w-md">
          {transition && (
            <>
              <DialogHeader>
                <DialogTitle>{transition.title}</DialogTitle>
                <DialogDescription>{transition.description}</DialogDescription>
              </DialogHeader>
              {warnings.length > 0 && (
                <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
                  {warnings.map((w) => (
                    <p
                      key={w}
                      className="flex items-start gap-2 text-sm text-warning"
                    >
                      <TriangleAlert
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      {w}
                    </p>
                  ))}
                </div>
              )}
              <form
                action={transition.action}
                className="flex justify-end gap-2"
              >
                <input type="hidden" name="id" value={courseId} />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPendingTransition(null)}
                >
                  Cancel
                </Button>
                <ConfirmTransitionButton label={transition.confirmLabel} />
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Module publish menu ──────────────────────────────────────────────────────

/**
 * Per-module publish menu (Canvas ContextModulesPublishIcon): icon carries the
 * state, the menu offers verb-first choices, and the trigger's accessible name
 * announces the current state.
 */
export function ModulePublishMenu({
  moduleId,
  courseId,
  title,
  published,
}: {
  moduleId: string;
  courseId: string;
  title: string;
  published: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function apply(state: "PUBLISHED" | "UNPUBLISHED", includeItems: boolean) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", moduleId);
        fd.set("courseId", courseId);
        fd.set("state", state);
        fd.set("includeItems", String(includeItems));
        await setModuleState(fd);
      } catch {
        toast.error("Couldn't update the module's publish state.");
      }
    });
  }

  if (isPending) {
    return (
      <span className="flex size-8 items-center justify-center" title="Saving…">
        <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
        <span className="sr-only">Saving publish state…</span>
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-0.5 rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`${title} publish options, ${published ? "published" : "unpublished"}`}
        >
          {published ? (
            <CheckCircle2 className="size-4 text-success" aria-hidden />
          ) : (
            <Circle className="size-4" aria-hidden />
          )}
          <ChevronDown className="size-3 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => apply("PUBLISHED", true)}>
          <CheckCircle2 className="text-success" /> Publish module and all items
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply("PUBLISHED", false)}>
          <CheckCircle2 className="text-success" /> Publish module only
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => apply("UNPUBLISHED", true)}>
          <Circle /> Unpublish module and all items
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply("UNPUBLISHED", false)}>
          <Circle /> Unpublish module only
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Item publish toggle ──────────────────────────────────────────────────────

/** One-click publish toggle for a module item; owned page/quiz follows. */
export function ItemPublishToggle({
  itemId,
  courseId,
  title,
  published,
}: {
  itemId: string;
  courseId: string;
  title: string;
  published: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", itemId);
        fd.set("courseId", courseId);
        fd.set("state", published ? "UNPUBLISHED" : "PUBLISHED");
        await setItemState(fd);
      } catch {
        toast.error("Couldn't update the item's publish state.");
      }
    });
  }

  if (isPending) {
    return (
      <span className="flex size-7 items-center justify-center" title="Saving…">
        <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden />
        <span className="sr-only">Saving publish state…</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={
        published
          ? "Published — click to unpublish"
          : "Unpublished — click to publish"
      }
      aria-label={`${title}, ${published ? "published" : "unpublished"} — click to ${published ? "unpublish" : "publish"}`}
      className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {published ? (
        <CheckCircle2 className="size-4 text-success" aria-hidden />
      ) : (
        <Circle className="size-4" aria-hidden />
      )}
    </button>
  );
}
