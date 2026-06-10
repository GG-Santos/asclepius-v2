import type * as React from "react";
import { cn } from "@/lib/utils";

// Standard empty state: a tinted icon medallion, heading, body, optional action.
// Replaces ad-hoc "grey sentence in a bordered box" placeholders.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-outline-variant/60 bg-card px-6 py-14 text-center shadow-[var(--shadow-clinical)] dark:border-white/[0.07]",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent [&_svg]:size-6">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-title-md text-on-surface">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
