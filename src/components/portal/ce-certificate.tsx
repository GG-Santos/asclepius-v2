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
 * every lesson is complete. Stable-dark artifact: deep-teal brand gradient in
 * BOTH color modes, so the white text ladder stays legible everywhere.
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
    <div
      className="overflow-hidden rounded-xl border-2 border-accent/40 text-white shadow-[var(--shadow-clinical-md)]"
      style={{ background: "var(--gradient-deep)" }}
    >
      <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <Award className="size-10 text-white/90" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Certificate of Completion
        </p>
        <p className="max-w-md text-sm text-white/75">This certifies that</p>
        <p className="font-bold text-2xl text-white">{name}</p>
        <p className="max-w-md text-sm text-white/75">
          has successfully completed the continuing-education course
        </p>
        <p className="font-semibold text-lg text-white">{courseTitle}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t border-white/15 pt-5 text-xs text-white/70">
          <span>
            <span className="font-semibold text-white">Certificate №</span>{" "}
            <span className="font-mono">{certificateNo}</span>
          </span>
          <span>
            <span className="font-semibold text-white">Completed</span>{" "}
            {formatDate(completedAt)}
          </span>
          <span>Armedsafe Training Center</span>
        </div>
      </div>
    </div>
  );
}
