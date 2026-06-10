import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Native select styled to match Input: outlined, focus thickens to Clinical
// Blue, dark-mode recess, error state via aria-invalid. A chevron is overlaid
// (native arrow removed via appearance-none).
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-11 w-full appearance-none rounded border border-outline-variant bg-card px-3 pr-9 text-sm text-on-surface shadow-none transition-colors",
          "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/30",
          "dark:border-white/[0.08] dark:bg-surface-low dark:focus:border-accent/60 dark:focus:ring-accent/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
        aria-hidden
      />
    </div>
  );
}
