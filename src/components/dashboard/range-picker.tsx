"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "1", label: "1d" },
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;

/** Time-range control. Drives every range-aware metric via the `range` param. */
export function RangePicker({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Highlight follows the URL (instant on click), not the server-rendered
  // prop — the prop only seeds the default when no ?range= is present.
  const current = params.get("range") ?? String(value);

  function select(v: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", v);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-outline-variant/60 bg-card p-0.5">
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => select(o.value)}
            aria-label={`Last ${o.value} days`}
            aria-pressed={active}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-accent/10 text-accent"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
