import { ArrowLeft, Settings2, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { Badge } from "@/components/ui/badge";
import { CredentialArtifacts } from "@/components/verify/credential-artifacts";
import {
  type GraduateWithPhoto,
  rankingLabel,
  SCORE_ROWS,
  scoreCompleteness,
  scoreTotal,
} from "@/lib/graduate";

// A reference-LcnViewer style field: small label above a boxed value.
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <div className="rounded-md border border-outline-variant/70 bg-surface-low px-3 py-2 text-sm text-on-surface">
        {value}
      </div>
    </div>
  );
}

export function CredentialView({
  g,
  name,
  qrDataUrl,
  manageHref = null,
}: {
  g: GraduateWithPhoto;
  name: string;
  qrDataUrl: string;
  manageHref?: string | null;
}) {
  const total = scoreTotal(g);
  const { present } = scoreCompleteness(g);
  const rank = rankingLabel(g.ranking);

  return (
    <div className="min-h-svh bg-surface">
      <PublicHeader />
      <div className="mx-auto max-w-5xl px-3 py-6 md:px-6 md:py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
          >
            <ArrowLeft className="size-4" /> New search
          </Link>
          {manageHref && (
            <Link
              href={manageHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
            >
              <Settings2 className="size-3.5" /> You&apos;re an admin — manage
              this record
            </Link>
          )}
        </div>

        {/* Credential card (reference layout) */}
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)]">
          {/* Card header bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-outline-variant/60 border-b px-5 py-4">
            <div className="flex items-center gap-2 font-semibold text-accent">
              <UserRound className="size-5" aria-hidden />
              <span>Emergency Medical Technician</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="verified">
                <ShieldCheck className="size-3.5" /> Verified
              </Badge>
              {g.legacy && <Badge variant="legacy">Legacy record</Badge>}
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Left rail */}
            <div className="border-outline-variant/60 p-5 md:w-1/3 md:border-r">
              <CredentialArtifacts
                name={name}
                lcn={g.lcn}
                issued={g.issuedRaw}
                expiration={g.expirationRaw}
                photoUrl={g.photo?.url ?? null}
                qrDataUrl={qrDataUrl}
              />
            </div>

            {/* Right: profile + scores */}
            <div className="space-y-6 p-5 md:w-2/3">
              <div>
                <h2 className="mb-3 font-semibold text-on-surface">
                  Profile Information
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Legal Name" value={name.toUpperCase()} />
                  <Field
                    label="License Number"
                    value={<span className="font-mono text-xs">{g.lcn}</span>}
                  />
                  <Field label="Date of Issuance" value={g.issuedRaw ?? "—"} />
                  <Field
                    label="Date of Expiration"
                    value={g.expirationRaw ?? "—"}
                  />
                  <Field
                    label="Latest Re-Certification"
                    value={g.registrationRaw ?? "—"}
                  />
                  <Field
                    label="Remarks"
                    value={
                      <span className="inline-flex items-center gap-1 font-semibold text-success">
                        {rank.medal && <span>{rank.medal}</span>}
                        {g.ranking && g.ranking > 0 ? rank.label : "Passed"}
                      </span>
                    }
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-2 font-semibold text-on-surface">
                  Over-All Proficiency Evaluation Record
                </h2>
                <p className="mb-3 text-justify text-xs text-on-surface-variant">
                  Scoring criteria describe the quality of evidence required at
                  different levels of achievement for each performance indicator
                  — a proficiency-based standard designed to be equitable and
                  consistent for every EMT graduate.
                </p>
                {present === 0 ? (
                  <div className="rounded-md border border-outline-variant/60 bg-surface-low px-4 py-6 text-center text-sm text-on-surface-variant">
                    Detailed proficiency scores are not on file for this
                    credential (legacy record). License validity is unaffected.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-primary text-on-primary">
                        <tr>
                          <th className="w-20 px-3 py-2 font-semibold">
                            Weight
                          </th>
                          <th className="px-3 py-2 font-semibold">
                            Examination
                          </th>
                          <th className="w-20 px-3 py-2 font-semibold">
                            Grade
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {SCORE_ROWS.map((row) => {
                          const v = g[row.key];
                          return (
                            <tr
                              key={row.key}
                              className="odd:bg-card even:bg-surface-low"
                            >
                              <td className="px-3 py-2 text-on-surface-variant">
                                {row.weight}
                              </td>
                              <td className="px-3 py-2">{row.label}</td>
                              <td className="px-3 py-2 font-mono">
                                {typeof v === "number" ? `${v}%` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-surface-highest font-semibold text-on-surface">
                          <td className="px-3 py-2">100%</td>
                          <td className="px-3 py-2">Total Evaluation</td>
                          <td className="px-3 py-2 font-mono">
                            {total === null ? "—" : `${total}%`}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-on-surface-variant">
          Verified against the official WSL EMS registry.
        </p>
      </div>
    </div>
  );
}
