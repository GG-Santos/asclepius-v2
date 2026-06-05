import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduateAccountManager } from "@/components/dashboard/graduate-account-manager";
import { GraduateDetailActions } from "@/components/dashboard/graduate-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialArtifacts } from "@/components/verify/credential-artifacts";
import {
  displayName,
  formatLastFirst,
  rankingLabel,
  SCORE_ROWS,
  scoreTotal,
  verificationState,
} from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { verifyQrDataUrl } from "@/lib/qr";
import { requireAdmin } from "@/lib/session";

const STATUS_BADGE: Record<
  "STUDENT" | "GRADUATE" | "ARCHIVED",
  { variant: "primary" | "verified" | "neutral"; label: string }
> = {
  STUDENT: { variant: "primary", label: "Student" },
  GRADUATE: { variant: "verified", label: "Graduate" },
  ARCHIVED: { variant: "neutral", label: "Archived" },
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-right font-medium text-on-surface">{value}</span>
    </div>
  );
}

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString() : "—";
}

export default async function GraduateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const g = await prisma.graduate.findUnique({
    where: { id },
    include: { photo: true, batch: true },
  });
  if (!g) notFound();

  const name = displayName(g);
  const state = verificationState(g);
  const total = scoreTotal(g);
  const rank = rankingLabel(g.ranking);
  const qrDataUrl = await verifyQrDataUrl(g.lcn);
  const statusBadge = STATUS_BADGE[g.status];

  // Global ranking (auto): position by total score among all non-archived.
  const scored = await prisma.graduate.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: {
      scoreFWE: true,
      scoreSJE: true,
      scoreEP: true,
      scorePAS: true,
      scoreCCST: true,
      scoreCCSM: true,
    },
  });
  const totalsAll = scored.map((s) => scoreTotal(s) ?? 0).filter((t) => t > 0);
  const myTotal = total ?? 0;
  const globalRank =
    myTotal > 0 ? totalsAll.filter((t) => t > myTotal).length + 1 : null;
  const globalCount = totalsAll.length;

  const portalAccount = await prisma.user.findFirst({
    where: { graduateLcn: g.lcn },
    select: { email: true },
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <Link
          href="/dashboard/graduates"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to records
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-on-surface">
              {name}
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              {state === "expired" && <Badge variant="expired">Expired</Badge>}
              {g.legacy && <Badge variant="legacy">Legacy</Badge>}
            </h1>
            <p className="mt-1 font-mono text-sm text-on-surface-variant">
              {g.lcn}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <GraduateDetailActions id={g.id} lcn={g.lcn} status={g.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        {/* Left: artifacts */}
        <Card>
          <CardContent className="p-5">
            <CredentialArtifacts
              name={name}
              lcn={g.lcn}
              issued={g.issuedRaw}
              expiration={g.expirationRaw}
              photoUrl={g.photo?.url ?? null}
              qrDataUrl={qrDataUrl}
            />
          </CardContent>
        </Card>

        {/* Right: internal detail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-outline-variant/40 pt-0">
              <Row
                label="Structured name"
                value={
                  formatLastFirst({
                    firstName: g.firstName,
                    middleName: g.middleName,
                    lastName: g.lastName,
                    suffix: g.suffix,
                  }) ?? "—"
                }
              />
              <Row label="Status" value={statusBadge.label} />
              <Row
                label="Legacy record"
                value={`${g.legacy ? "Yes" : "No"} (auto)`}
              />
              <Row
                label="Batch"
                value={
                  g.batchCode
                    ? `${g.batchCode}${g.batch?.label ? ` · ${g.batch.label}` : ""}`
                    : "—"
                }
              />
              <Row
                label="Ranking (auto)"
                value={
                  <span className="inline-flex items-center gap-2">
                    <span>
                      {g.ranking && g.ranking > 0
                        ? `${rank.medal ?? ""} Batch #${g.ranking}`
                        : "Batch — Passed"}
                    </span>
                    {globalRank && (
                      <span className="text-on-surface-variant">
                        · Global #{globalRank} of {globalCount}
                      </span>
                    )}
                  </span>
                }
              />
              <Row label="Created" value={g.createdAt.toLocaleString()} />
              <Row label="Last updated" value={g.updatedAt.toLocaleString()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dates</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-outline-variant/40 pt-0">
              <Row
                label="Date issued"
                value={`${g.issuedRaw ?? "—"}${g.issuedAt ? ` (${fmt(g.issuedAt)})` : ""}`}
              />
              <Row
                label="Date of expiration"
                value={`${g.expirationRaw ?? "—"}${g.expiresAt ? ` (${fmt(g.expiresAt)})` : ""}`}
              />
              <Row
                label="Latest re-certification"
                value={`${g.registrationRaw ?? "—"}${g.registeredAt ? ` (${fmt(g.registeredAt)})` : ""}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Proficiency scores</CardTitle>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                {rank.medal && <span>{rank.medal}</span>}
                {g.ranking && g.ranking > 0 ? rank.label : "Passed"}
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-surface-container">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Weight</th>
                      <th className="px-3 py-2 font-semibold">Examination</th>
                      <th className="px-3 py-2 font-semibold">Grade</th>
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
            </CardContent>
          </Card>

          {g.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line pt-0 text-sm text-on-surface-variant">
                {g.notes}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Graduate portal account
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <GraduateAccountManager
                lcn={g.lcn}
                existingEmail={portalAccount?.email ?? null}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
