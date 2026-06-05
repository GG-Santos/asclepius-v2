import { Award } from "lucide-react";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Continuing-education completion certificate, shown on a course overview once
 * every lesson is complete. Self-contained navy clinical card.
 */
export function CeCertificate({
  name,
  courseTitle,
  certificateNo,
  completedAt,
}: {
  name: string;
  courseTitle: string;
  certificateNo: string;
  completedAt: Date;
}) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-accent/40 bg-primary text-on-primary shadow-[var(--shadow-clinical-md)]">
      <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <Award className="size-10 text-accent-bright" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-primary-container/70">
          Certificate of Completion
        </p>
        <p className="max-w-md text-sm text-on-primary-container/80">
          This certifies that
        </p>
        <p className="font-bold text-2xl text-on-primary">{name}</p>
        <p className="max-w-md text-sm text-on-primary-container/80">
          has successfully completed the continuing-education course
        </p>
        <p className="font-semibold text-lg text-accent-bright">
          {courseTitle}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t border-on-primary/15 pt-5 text-xs text-on-primary-container/70">
          <span>
            <span className="font-semibold text-on-primary">Certificate №</span>{" "}
            <span className="font-mono">{certificateNo}</span>
          </span>
          <span>
            <span className="font-semibold text-on-primary">Completed</span>{" "}
            {formatDate(completedAt)}
          </span>
          <span>Armedsafe Training Center</span>
        </div>
      </div>
    </div>
  );
}
