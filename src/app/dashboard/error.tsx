"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Route-segment error boundary for the dashboard: a designed failure state
// instead of the framework default. Reset re-renders the segment.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-3 rounded-lg border border-outline-variant/60 bg-card px-6 py-16 text-center dark:border-white/[0.07]">
      <div className="flex size-12 items-center justify-center rounded-full bg-error/10 text-error [&_svg]:size-6">
        <AlertTriangle aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-title-md text-on-surface">
          This section hit a problem
        </p>
        <p className="mx-auto max-w-sm text-sm text-on-surface-variant">
          The rest of the dashboard is unaffected. Try again — if it keeps
          happening, note what you were doing and tell an administrator.
        </p>
        {error.digest ? (
          <p className="text-data-mono text-on-surface-variant/70">
            ref {error.digest}
          </p>
        ) : null}
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        <RotateCcw aria-hidden /> Try again
      </Button>
    </div>
  );
}
