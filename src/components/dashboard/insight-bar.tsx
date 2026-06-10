import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { InsightLine, InsightTone } from "@/lib/dashboard-insights";
import { cn } from "@/lib/utils";

const TONE: Record<
  InsightTone,
  { wrap: string; text: string; icon: ComponentType<{ className?: string }> }
> = {
  p0: {
    wrap: "border-secondary/40 bg-secondary/5",
    text: "text-secondary",
    icon: CircleAlert,
  },
  p1: {
    wrap: "border-warning/40 bg-warning/5",
    text: "text-warning",
    icon: TriangleAlert,
  },
  p2: {
    wrap: "border-outline-variant/60 bg-surface-low",
    text: "text-on-surface-variant",
    icon: Info,
  },
  ok: {
    wrap: "border-success/40 bg-success/5",
    text: "text-success",
    icon: CircleCheck,
  },
  info: {
    wrap: "border-outline-variant/60 bg-card",
    text: "text-on-surface-variant",
    icon: Info,
  },
};

export function InsightBar({ lines }: { lines: InsightLine[] }) {
  if (lines.length === 0) return null;
  const lead = TONE[lines[0].tone];
  return (
    <Card className={cn("border", lead.wrap)}>
      <CardContent className="flex flex-col gap-2 p-4">
        {lines.map((line, i) => {
          const t = TONE[line.tone];
          const Icon = t.icon;
          return (
            <div key={line.text} className="flex items-start gap-2.5 text-sm">
              <Icon className={cn("mt-0.5 size-4 shrink-0", t.text)} />
              <span
                className={
                  i === 0
                    ? "font-medium text-on-surface"
                    : "text-on-surface-variant"
                }
              >
                {line.text}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
