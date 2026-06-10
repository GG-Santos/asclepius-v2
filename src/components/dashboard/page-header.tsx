import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Uniform dashboard page header (R5): title + contextual meta + primary
 * actions. Consumed by each section page — never embedded in the shared
 * layout. Pure server-renderable presentation.
 */
export function PageHeader({
  title,
  eyebrow,
  meta,
  actions,
  className,
}: {
  /** Page title — string or rich node (may include status chips). */
  title: React.ReactNode;
  /** Tracked-caps microlabel above the title (section context). */
  eyebrow?: React.ReactNode;
  /** Contextual meta under the title: counts, identifiers, hints. */
  meta?: React.ReactNode;
  /** Primary actions, right-aligned; wraps below title on small screens. */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-label-caps mb-1 text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="text-headline-lg text-on-surface">{title}</h1>
        {meta ? (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            {meta}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
