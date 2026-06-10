import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert, Severity } from "@/lib/dashboard-insights";
import { cn } from "@/lib/utils";

const DOT: Record<Severity, string> = {
  p0: "bg-secondary",
  p1: "bg-warning",
  p2: "bg-on-surface-variant",
};

export function NeedsAttention({ alerts }: { alerts: Alert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">
            All clear — nothing needs attention right now.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant/40">
            {alerts.map((a) => (
              <li key={a.title}>
                <Link
                  href={a.href}
                  className="group flex items-center gap-3 py-3 text-sm"
                >
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      DOT[a.severity],
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-on-surface">
                      {a.title}
                    </span>
                    <span className="block text-xs text-on-surface-variant">
                      {a.detail}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent group-hover:underline">
                    {a.actionLabel}
                    <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
