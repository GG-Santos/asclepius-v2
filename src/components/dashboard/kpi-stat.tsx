import Link from "next/link";
import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

export type KpiTone = "success" | "warning" | "critical" | "accent";
export type KpiDelta = {
  text: string;
  direction: "up" | "down" | "flat";
  good: boolean | null; // null = direction is neither good nor bad to colour
};

const TONE: Record<KpiTone, { chip: string; spark: string; dot: string }> = {
  success: {
    chip: "bg-success/10 text-success",
    spark: "text-success",
    dot: "bg-success",
  },
  warning: {
    chip: "bg-warning/10 text-warning",
    spark: "text-warning",
    dot: "bg-warning",
  },
  critical: {
    chip: "bg-secondary/10 text-secondary",
    spark: "text-secondary",
    dot: "bg-secondary",
  },
  accent: {
    chip: "bg-accent/10 text-accent",
    spark: "text-accent",
    dot: "bg-accent",
  },
};

function DeltaView({ delta }: { delta?: KpiDelta | null }) {
  // No history yet → an honest em dash, never a fabricated 0%.
  if (!delta) {
    return (
      <span
        className="text-xs font-medium text-on-surface-variant"
        title="No prior-period data yet"
      >
        —
      </span>
    );
  }
  const color =
    delta.good == null
      ? "text-on-surface-variant"
      : delta.good
        ? "text-success"
        : "text-secondary";
  const arrow =
    delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "•";
  return (
    <span className={cn("tabular text-xs font-medium", color)}>
      {arrow} {delta.text}
    </span>
  );
}

export function KpiStat({
  icon: Icon,
  label,
  value,
  context,
  reading,
  tone = "accent",
  delta,
  sparkline,
  href,
  badge,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  context?: string;
  /** Plain-language interpretation of the metric — what it means, not what it is (R4). */
  reading?: string;
  tone?: KpiTone;
  delta?: KpiDelta | null;
  sparkline?: number[];
  href?: string;
  badge?: string;
}) {
  const t = TONE[tone];
  const valueText = typeof value === "number" ? value.toLocaleString() : value;

  const body = (
    <Card
      className={cn(
        "h-full",
        // Hover-lift signals "clickable" — only when there's a drill-down.
        href && "transition-shadow hover:shadow-[var(--shadow-clinical-md)]",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-on-surface-variant">{label}</p>
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              t.chip,
            )}
          >
            <Icon className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="tabular text-3xl font-bold tracking-tight text-on-surface">
            {valueText}
            {badge && (
              <span className="ml-2 rounded bg-secondary/15 px-1.5 py-0.5 align-middle text-[10px] font-bold text-secondary">
                {badge}
              </span>
            )}
          </p>
          <DeltaView delta={delta} />
        </div>
        {context && (
          <p className="mt-1 text-xs text-on-surface-variant">{context}</p>
        )}
        {sparkline && sparkline.length > 1 && (
          <div className={cn("mt-3 h-8", t.spark)}>
            <Sparkline data={sparkline} />
          </div>
        )}
        {reading && (
          <p className="mt-3 flex items-start gap-1.5 border-t border-outline-variant/50 pt-2 text-xs leading-snug text-on-surface-variant dark:border-white/[0.06]">
            <span
              className={cn("mt-1 size-1.5 shrink-0 rounded-full", t.dot)}
              aria-hidden
            />
            {reading}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
