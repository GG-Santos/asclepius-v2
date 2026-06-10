import { ArrowLeft, Settings2, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { Badge } from "@/components/ui/badge";
import { CredentialArtifacts } from "@/components/verify/credential-artifacts";
import { ShareLinkButton } from "@/components/verify/share-link-button";
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
      <div className="rounded-md border border-outline-variant/70 bg-surface-low px-3 py-2 text-sm text-on-surface dark:border-white/[0.08]">
        {value}
      </div>
    </div>
  );
}

export type CohortBadge = {
  id: string;
  code: string;
  label: string | null;
  logoUrl: string | null;
};

export function CredentialView({
  g,
  name,
  qrDataUrl,
  certQrDataUrl = null,
  manageHref = null,
  batch = null,
}: {
  g: GraduateWithPhoto;
  name: string;
  qrDataUrl: string;
  certQrDataUrl?: string | null;
  manageHref?: string | null;
  /** Cohort crest shown in the public credential rail. */
  batch?: CohortBadge | null;
}) {
  const total = scoreTotal(g);
  const { present } = scoreCompleteness(g);
  const rank = rankingLabel(g.ranking);
  const remaining = remainingLabel(g.expiresAt ?? null);

  return (
    <div className="min-h-svh bg-surface">
      <PublicHeader />
      <div className="mx-auto max-w-5xl px-3 py-6 md:px-6 md:py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded text-sm text-on-surface-variant hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft className="size-4" /> New search
          </Link>
          {manageHref && (
            <Link
              href={manageHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Settings2 className="size-3.5" /> You&apos;re an admin — manage
              this record
            </Link>
          )}
        </div>

        {/* Credential card */}
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)] dark:border-white/[0.08]">
          {/* Verdict strip — the answer first: this license is valid, right now. */}
          <div className="border-b border-success/25 bg-success/[0.07] px-5 py-4 dark:bg-success/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <ShieldCheck className="size-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-label-caps text-success">
                    License verified
                  </p>
                  <h1 className="truncate font-bold text-lg text-on-surface">
                    {name.toUpperCase()}
                  </h1>
                  <p className="text-sm text-on-surface-variant">
                    {g.expirationRaw ? (
                      <>
                        Valid until{" "}
                        <span className="font-medium text-on-surface">
                          {g.expirationRaw}
                        </span>
                        {remaining ? ` · ${remaining}` : ""}
                      </>
                    ) : (
                      "No expiration date on record"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex items-center gap-2">
                  <span className="tabular rounded bg-surface-container px-2 py-1 font-mono text-xs text-on-surface dark:bg-white/[0.06]">
                    {g.lcn}
                  </span>
                  {g.legacy && <Badge variant="legacy">Legacy record</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">
                    Real-time registry check · just now
                  </span>
                  <ShareLinkButton />
                </div>
              </div>
            </div>
          </div>

          {/* Card header bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 px-5 py-3 dark:border-white/[0.07]">
            <div className="flex items-center gap-2 font-semibold text-accent">
              <UserRound className="size-5" aria-hidden />
              <span>Emergency Medical Technician</span>
            </div>
            <Badge variant="verified">
              <ShieldCheck className="size-3.5" /> Verified
            </Badge>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Left rail */}
            <div className="p-5 md:w-1/3 md:border-r md:border-outline-variant/60 dark:md:border-white/[0.07]">
              <CredentialArtifacts
                name={name}
                lcn={g.lcn}
                issued={g.issuedRaw}
                expiration={g.expirationRaw}
                photoUrl={g.photo?.url ?? null}
                qrDataUrl={qrDataUrl}
                certQrDataUrl={certQrDataUrl}
                batch={batch}
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
                      <thead className="border-b border-outline-variant bg-surface-container text-on-surface dark:border-white/[0.06]">
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
                              className="odd:bg-transparent even:bg-white/[0.025] dark:odd:bg-transparent dark:even:bg-white/[0.025]"
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
                        <tr className="bg-surface-highest font-semibold text-on-surface dark:bg-white/[0.04] dark:border-t dark:border-white/[0.08]">
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
          {/* Trust footer — how this check works, and where to raise a flag. */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-outline-variant/60 bg-surface-low/60 px-5 py-3 text-xs text-on-surface-variant dark:border-white/[0.07] dark:bg-white/[0.02]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-success" aria-hidden />
              Checked live against the official WSL EMS registry — every lookup
              is recorded.
            </span>
            <span>
              Believe this record is wrong?{" "}
              <Link
                href="/enroll"
                className="font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Contact the training center
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Plain-language time-to-expiry ("about 14 months remaining"). */
function remainingLabel(expiresAt: Date | null): string | null {
  if (!expiresAt) return null;
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return null;
  if (days < 60) return `${days} day${days === 1 ? "" : "s"} remaining`;
  const months = Math.round(days / 30.44);
  return `about ${months} month${months === 1 ? "" : "s"} remaining`;
}
