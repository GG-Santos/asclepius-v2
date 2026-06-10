import type * as React from "react";
import { cn } from "@/lib/utils";

// Outlined textarea matching Input: focus thickens to Clinical Blue, dark-mode
// recess into the card, error state via aria-invalid.
export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex w-full rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface shadow-none transition-colors",
        "placeholder:text-on-surface-variant/60",
        "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/30",
        "dark:border-white/[0.08] dark:bg-surface-low dark:focus:border-accent/60 dark:focus:ring-accent/20 dark:focus:bg-surface-container",
        className,
      )}
      {...props}
    />
  );
}
