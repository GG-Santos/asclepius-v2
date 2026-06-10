import { ArrowRight, CheckCircle2, Circle, ListChecks } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export type ChecklistStep = {
  key: string;
  title: string;
  /** One friendly sentence explaining why the step matters. */
  text: string;
  /** Derived from live data — never manually ticked (Canvas course wizard). */
  done: boolean;
  href?: string;
};

/**
 * Setup checklist for a course (Canvas course_wizard pattern): every step's
 * completion is computed from what actually exists, each step deep-links to
 * where the work happens, and the list collapses once setup is complete.
 */
export function CourseChecklist({ steps }: { steps: ChecklistStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (allDone) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
          <p className="text-sm text-on-surface">
            <span className="font-medium">Setup complete.</span>{" "}
            <span className="text-on-surface-variant">
              All {steps.length} checklist steps are done.
            </span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-title-md text-on-surface">
            <ListChecks className="size-5 text-accent" aria-hidden /> Setup
            checklist
          </h2>
          <p className="text-data-mono text-on-surface-variant">
            {doneCount}/{steps.length}
          </p>
        </div>
        <ol className="divide-y divide-outline-variant/40">
          {steps.map((step) => (
            <li
              key={step.key}
              className="flex items-start justify-between gap-3 py-2.5"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                {step.done ? (
                  <CheckCircle2
                    className="mt-0.5 size-4.5 shrink-0 text-success"
                    aria-hidden
                  />
                ) : (
                  <Circle
                    className="mt-0.5 size-4.5 shrink-0 text-on-surface-variant/50"
                    aria-hidden
                  />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${step.done ? "text-on-surface-variant" : "text-on-surface"}`}
                  >
                    {step.title}
                    {step.done && <span className="sr-only"> — done</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {step.text}
                  </p>
                </div>
              </div>
              {!step.done && step.href && (
                <Link
                  href={step.href}
                  className="flex shrink-0 items-center gap-1 rounded text-sm text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Go <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
