import { ArrowLeft, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTestimonialForm } from "@/components/dashboard/admin-testimonial-form";
import { GraduateAccountManager } from "@/components/dashboard/graduate-account-manager";
import { GraduateDetailActions } from "@/components/dashboard/graduate-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialArtifacts } from "@/components/verify/credential-artifacts";
import {
  computeSchemeResult,
  isComponentPassing,
  isLegacyGradeBookBatch,
  parseGradingScheme,
  parseSchemeScores,
} from "@/lib/assessment-scheme";
import { imageToDataUri } from "@/lib/data-uri";
import {
  displayName,
  formatLastFirst,
  verificationState,
} from "@/lib/graduate";
import { getActiveTemplate, getExpiryPolicy } from "@/lib/org-settings";
import { prisma } from "@/lib/prisma";
import { certificateQrDataUrl, verifyQrDataUrl } from "@/lib/qr";
import { medalFor, rankGraduates } from "@/lib/ranking";
import { requireAdmin } from "@/lib/session";
import {
  isPracticalPassing,
  isQuizPassing,
  PRACTICAL_DEFS,
  parseGranularGrades,
  quizDefsFor,
  quizMaxTotal,
} from "@/lib/student-grades";

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

/** "2023-05-14" -> "05/14/23" for compact exam-date display. */
function fmtExamDate(iso?: string): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1].slice(2)}` : null;
}

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        pass ? "bg-success/15 text-success" : "bg-error/15 text-error"
      }`}
    >
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString() : "—";
}

function mapsPinUrl(g: {
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  town: string | null;
  country: string | null;
  postalCode: string | null;
  mapsUrl: string | null;
}) {
  if (g.mapsUrl?.trim()) return g.mapsUrl.trim();
  const query = [
    g.streetAddress,
    g.town,
    g.city,
    g.province,
    g.postalCode,
    g.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
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
  const legacyGradeBook = isLegacyGradeBookBatch(g.batchCode);
  const qrDataUrl = await verifyQrDataUrl(g.lcn);
  const certQrDataUrl = await certificateQrDataUrl(g.lcn);
  const statusBadge = STATUS_BADGE[g.status];
  const contactPinUrl = mapsPinUrl(g);

  // Ranking (auto, weighted): batch + global among non-archived, non-legacy
  // graduates. Legacy records have no grade data to rank.
  const allGrads = await prisma.graduate.findMany({
    where: { status: { not: "ARCHIVED" }, legacy: false },
    select: {
      id: true,
      batchCode: true,
      scoreFWE: true,
      scoreSJE: true,
      scoreEP: true,
      scorePAS: true,
      scoreCCST: true,
      scoreCCSM: true,
      bonusPoints: true,
    },
  });
  const globalRanks = rankGraduates(
    allGrads.map((x) => ({ id: x.id, six: x })),
  );
  const batchGrads = g.batchCode
    ? allGrads.filter((x) => x.batchCode === g.batchCode)
    : [];
  const batchRank =
    rankGraduates(batchGrads.map((x) => ({ id: x.id, six: x }))).get(g.id)
      ?.rank ?? null;
  const globalRank = globalRanks.get(g.id)?.rank ?? null;
  const globalCount = [...globalRanks.values()].filter(
    (r) => r.rank != null,
  ).length;

  const portalAccount = await prisma.user.findFirst({
    where: { graduateLcn: g.lcn },
    select: { id: true, email: true, canBlog: true },
  });
  const testimonial = await prisma.testimonial.findFirst({
    where: { submittedByLcn: g.lcn },
    select: {
      quote: true,
      rating: true,
      approved: true,
      placeholder: true,
    },
  });
  const sourceStudent = g.fromStudentEnrollmentNo
    ? await prisma.student.findUnique({
        where: { enrollmentNo: g.fromStudentEnrollmentNo },
        include: { batch: true },
      })
    : await prisma.student.findFirst({
        where: { graduatedToLcn: g.lcn },
        include: { batch: true },
      });

  const studentScheme = sourceStudent
    ? parseGradingScheme(sourceStudent.batch?.gradingScheme)
    : null;
  const studentQuizDefs = sourceStudent
    ? quizDefsFor(sourceStudent.batch?.quizDefs)
    : [];
  const studentGrades =
    sourceStudent && !studentScheme
      ? parseGranularGrades(sourceStudent.granularGrades, studentQuizDefs)
      : {};
  const studentSchemeScores =
    sourceStudent && studentScheme
      ? parseSchemeScores(sourceStudent.granularGrades, studentScheme)
      : null;
  const studentSchemeResult =
    studentScheme && studentSchemeScores && sourceStudent
      ? computeSchemeResult(
          studentScheme,
          studentSchemeScores,
          sourceStudent.bonusPoints,
        )
      : null;
  const quizRawTotal = studentQuizDefs.reduce((sum, def) => {
    const value = studentGrades[def.key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
  const quizEntered = studentQuizDefs.filter(
    (def) => typeof studentGrades[def.key] === "number",
  ).length;
  const quizMax = quizMaxTotal(studentQuizDefs);

  // Photo inlined as a data URI so client-side PNG rasterization of the
  // artifacts never hits a cross-origin canvas taint.
  const photoDataUri = await imageToDataUri(g.photo?.url ?? null);

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
          <GraduateDetailActions
            id={g.id}
            lcn={g.lcn}
            status={g.status}
            validityYears={(await getExpiryPolicy()).licenseValidityYears}
          />
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
              certQrDataUrl={certQrDataUrl}
              downloadable
              photoDataUrl={photoDataUri}
              template={await getActiveTemplate()}
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
                label="Batch"
                value={
                  g.batchCode
                    ? `${g.batchCode}${g.batch?.label ? ` · ${g.batch.label}` : ""}`
                    : "—"
                }
              />
              <Row
                label="Ranking (weighted)"
                value={
                  <span className="inline-flex items-center gap-2">
                    <span>
                      {batchRank
                        ? `${medalFor(batchRank) ?? ""} Batch #${batchRank}`
                        : "Batch —"}
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
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Private contact</CardTitle>
              {contactPinUrl && (
                <Link
                  href={contactPinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-card px-2.5 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-accent hover:text-accent"
                >
                  <MapPin className="size-3.5" aria-hidden />
                  Open pin
                  <ExternalLink className="size-3" aria-hidden />
                </Link>
              )}
            </CardHeader>
            <CardContent className="divide-y divide-outline-variant/40 pt-0">
              <Row label="Phone" value={g.phone ?? "—"} />
              <Row label="Sex" value={g.gender ?? "—"} />
              <Row label="Street address" value={g.streetAddress ?? "—"} />
              <Row label="Town / municipality" value={g.town ?? "—"} />
              <Row label="City / province" value={g.city ?? "—"} />
              <Row label="Region / state" value={g.province ?? "—"} />
              <Row label="ZIP / postal code" value={g.postalCode ?? "—"} />
              <Row label="Country" value={g.country ?? "—"} />
            </CardContent>
          </Card>

          {!legacyGradeBook && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Proficiency scores</CardTitle>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-on-surface">
                  {medalFor(batchRank) && <span>{medalFor(batchRank)}</span>}
                  {batchRank ? `Batch #${batchRank}` : "—"}
                </span>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {!sourceStudent ? (
                  <div className="rounded-md border border-outline-variant/60 bg-surface-low px-3 py-2 text-sm text-on-surface-variant">
                    No linked student grade record.
                  </div>
                ) : studentScheme &&
                  studentSchemeResult &&
                  studentSchemeScores ? (
                  <div className="space-y-2">
                    {studentScheme.categories.map((category) => {
                      const groupRollup =
                        studentSchemeResult.groups[category.key];
                      const comps = studentScheme.components.filter(
                        (component) => component.group === category.key,
                      );
                      return (
                        <details
                          key={category.key}
                          className="group rounded-md border border-outline-variant/60"
                        >
                          <summary className="flex cursor-pointer select-none flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-surface-highest px-3 py-2 text-sm font-semibold text-on-surface [&::-webkit-details-marker]:hidden">
                            <ChevronRight
                              className="size-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-90"
                              aria-hidden
                            />
                            <span className="w-10 font-normal text-on-surface-variant">
                              {category.weight}%
                            </span>
                            <span>{category.label}</span>
                            <span className="ml-auto flex items-center font-mono text-xs">
                              <span
                                className="w-24 text-right text-on-surface-variant"
                                title="Raw score / max"
                              >
                                {groupRollup && groupRollup.entered > 0
                                  ? `${groupRollup.sum}/${groupRollup.max}`
                                  : `—/${groupRollup?.max ?? "—"}`}
                              </span>
                              <span
                                className="w-16 text-right"
                                title="Category percentage"
                              >
                                {groupRollup?.averagePercent != null
                                  ? `${groupRollup.averagePercent}%`
                                  : "—"}
                              </span>
                              <span
                                className="w-20 text-right text-accent"
                                title={`Weighted points (of ${category.weight})`}
                              >
                                {groupRollup?.contribution != null
                                  ? `${groupRollup.contribution} pts`
                                  : "—"}
                              </span>
                            </span>
                          </summary>
                          <div className="overflow-x-auto border-outline-variant/60 border-t">
                            <table className="w-full table-fixed text-left text-xs">
                              <colgroup>
                                <col />
                                <col className="w-14" />
                                <col className="w-14" />
                                <col className="w-14" />
                                <col className="w-20" />
                              </colgroup>
                              <thead className="bg-surface-container">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">
                                    Assessment
                                  </th>
                                  <th className="px-3 py-2 text-center font-semibold">
                                    Max
                                  </th>
                                  <th className="px-3 py-2 text-center font-semibold">
                                    Score
                                  </th>
                                  <th className="px-3 py-2 text-center font-semibold">
                                    %
                                  </th>
                                  <th className="px-3 py-2 text-center font-semibold">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {comps.map((component) => {
                                  const rawScore =
                                    studentSchemeScores[component.key];
                                  const entered = typeof rawScore === "number";
                                  const pass = entered
                                    ? isComponentPassing(component, rawScore)
                                    : null;
                                  return (
                                    <tr
                                      key={component.key}
                                      className="odd:bg-card even:bg-surface-low"
                                    >
                                      <td className="truncate px-3 py-2">
                                        <span className="mr-2 inline-block w-14 font-mono text-[10px] text-on-surface-variant">
                                          {fmtExamDate(component.date) ?? ""}
                                        </span>
                                        {component.label}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono">
                                        {component.maxScore}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono">
                                        {entered ? rawScore : "—"}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono">
                                        {entered
                                          ? `${Math.round((rawScore / component.maxScore) * 1000) / 10}%`
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        {pass === null ? (
                                          <span className="text-on-surface-variant">
                                            —
                                          </span>
                                        ) : (
                                          <PassBadge pass={pass} />
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      );
                    })}

                    {studentSchemeResult.bonusApplied !== 0 && (
                      <div className="flex items-center justify-between rounded-md border border-outline-variant/60 px-3 py-2 text-sm">
                        <span className="font-semibold text-on-surface">
                          Bonus points
                          <span className="ml-2 font-normal text-xs text-on-surface-variant">
                            {sourceStudent.bonusNote ??
                              "admin-granted adjustment"}
                          </span>
                        </span>
                        <span className="font-mono text-accent">
                          {studentSchemeResult.bonusApplied > 0
                            ? `+${studentSchemeResult.bonusApplied}`
                            : studentSchemeResult.bonusApplied}{" "}
                          pts
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-md bg-surface-highest px-3 py-2 text-sm font-semibold text-on-surface">
                      <span>Total Evaluation</span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono">
                          {studentSchemeResult.total ?? "—"} / 100
                        </span>
                        <span className="text-xs uppercase text-on-surface-variant">
                          {studentSchemeResult.verdict}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-surface-container">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Quiz</th>
                            <th className="px-3 py-2 text-center font-semibold">
                              Max
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                              Pass
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                              Score
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentQuizDefs.map((def) => {
                            const rawScore = studentGrades[def.key];
                            const entered = typeof rawScore === "number";
                            const pass =
                              entered &&
                              isQuizPassing(def.key, rawScore, studentQuizDefs);
                            return (
                              <tr
                                key={def.key}
                                className="odd:bg-card even:bg-surface-low"
                              >
                                <td className="px-3 py-2 font-medium">
                                  {def.label}
                                  {def.date && (
                                    <span className="block text-[10px] font-normal text-on-surface-variant">
                                      {def.date}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {def.maxScore}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {def.passing}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {entered ? rawScore : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {entered ? (
                                    <PassBadge pass={pass} />
                                  ) : (
                                    <span className="text-on-surface-variant">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-outline-variant/60 border-t bg-surface-highest font-semibold">
                          <tr>
                            <td className="px-3 py-2">Quiz total</td>
                            <td className="px-3 py-2 text-center font-mono">
                              {quizMax}
                            </td>
                            <td />
                            <td className="px-3 py-2 text-center font-mono">
                              {quizEntered > 0 ? quizRawTotal : "—"}
                            </td>
                            <td className="px-3 py-2 text-center text-on-surface-variant">
                              {quizEntered > 0
                                ? `${Math.round((quizRawTotal / quizMax) * 10000) / 100}%`
                                : "—"}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-surface-container">
                          <tr>
                            <th className="px-3 py-2 font-semibold">
                              Examination
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                              Max
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                              Pass
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                              Raw
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {PRACTICAL_DEFS.map((def) => {
                            const rawScore = sourceStudent[def.key] as
                              | number
                              | null;
                            const entered = typeof rawScore === "number";
                            const pass =
                              entered && isPracticalPassing(def.key, rawScore);
                            return (
                              <tr
                                key={def.key}
                                className="odd:bg-card even:bg-surface-low"
                              >
                                <td className="px-3 py-2">{def.label}</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {def.maxScore}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {def.passing}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {entered ? rawScore : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {entered ? (
                                    <PassBadge pass={pass} />
                                  ) : (
                                    <span className="text-on-surface-variant">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                accountId={portalAccount?.id ?? null}
                canBlog={portalAccount?.canBlog ?? false}
              />
            </CardContent>
          </Card>

          {/* Their testimonial: show its state, or let the admin enter a
              placeholder on their behalf (one per graduate). */}
          {testimonial ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Testimonial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex items-center gap-1 text-warning">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <svg
                      key={`star-${i + 1}`}
                      viewBox="0 0 24 24"
                      className="size-3.5 fill-current"
                      aria-hidden="true"
                    >
                      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm italic text-on-surface">
                  "{testimonial.quote}"
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={testimonial.approved ? "verified" : "neutral"}
                  >
                    {testimonial.approved ? "Published" : "Pending review"}
                  </Badge>
                  {testimonial.placeholder && (
                    <Badge variant="legacy">
                      Placeholder — replaced when they submit their own
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  Manage it under Dashboard → Testimonials.
                </p>
              </CardContent>
            </Card>
          ) : (
            <AdminTestimonialForm
              graduate={{
                lcn: g.lcn,
                name,
                batchCode: g.batchCode,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
