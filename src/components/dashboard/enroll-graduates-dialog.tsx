"use client";

import { Search, UserPlus } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  adminEnrollGraduates,
  type CourseActionState,
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
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

export type EnrollCandidate = {
  lcn: string;
  name: string;
};

/**
 * Admin enrollment (Canvas "+People" scaled to one step): search the
 * graduate registry, select, enroll. Candidates already exclude enrolled
 * graduates; selection resets every time the dialog opens.
 */
export function EnrollGraduatesDialog({
  courseId,
  coursePublished,
  candidates,
}: {
  courseId: string;
  coursePublished: boolean;
  candidates: EnrollCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState<
    CourseActionState,
    FormData
  >(adminEnrollGraduates, {});
  const handled = useRef(false);

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success("Graduates enrolled.");
      setOpen(false);
      setTimeout(() => {
        handled.current = false;
      }, 100);
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.lcn.toLowerCase().includes(q),
    );
  }, [candidates, query]);

  function toggle(lcn: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lcn)) next.delete(lcn);
      else next.add(lcn);
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          // Reset on every open (Canvas add_people resets its wizard).
          setQuery("");
          setSelected(new Set());
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          disabled={!coursePublished}
          title={
            coursePublished
              ? undefined
              : "Publish the course before enrolling graduates"
          }
        >
          <UserPlus aria-hidden /> Enroll graduates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll graduates</DialogTitle>
          <DialogDescription>
            Search the registry by name or license number. Graduates already on
            the roster aren't listed.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or LCN…"
            aria-label="Search graduates"
            className="pl-9"
          />
        </div>

        {candidates.length === 0 ? (
          <EmptyState
            icon={<UserPlus aria-hidden />}
            title="Everyone's enrolled"
            description="Every graduate in the registry is already on this roster."
            className="py-8"
          />
        ) : (
          <div className="max-h-64 space-y-0.5 overflow-y-auto rounded border border-outline-variant/60 p-1.5">
            {visible.length === 0 ? (
              <p className="px-2 py-3 text-sm text-on-surface-variant">
                No graduates match “{query}”.
              </p>
            ) : (
              visible.map((c) => (
                <label
                  key={c.lcn}
                  className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-surface-container"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.lcn)}
                    onChange={() => toggle(c.lcn)}
                    className="size-4 rounded border-outline-variant accent-accent"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                    {c.name}
                  </span>
                  <span className="shrink-0 text-data-mono text-xs text-on-surface-variant">
                    {c.lcn}
                  </span>
                </label>
              ))
            )}
          </div>
        )}

        <form
          action={formAction}
          className="flex items-center justify-between gap-2"
        >
          <input type="hidden" name="courseId" value={courseId} />
          {[...selected].map((lcn) => (
            <input key={lcn} type="hidden" name="lcn" value={lcn} />
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
              {pending
                ? "Enrolling…"
                : `Enroll ${selected.size > 0 ? selected.size : ""}`.trim()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
