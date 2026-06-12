import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { GraduatesDataTable } from "@/components/dashboard/graduates-data-table";
import type { GraduateRow } from "@/components/dashboard/graduates-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { displayName, verificationState } from "@/lib/graduate";
import { getExpiryPolicy } from "@/lib/org-settings";
import { prisma } from "@/lib/prisma";
import { rankGraduates } from "@/lib/ranking";
import { requireAdmin } from "@/lib/session";

const STATUSES = ["STUDENT", "GRADUATE", "ARCHIVED"] as const;
const STATES = ["valid", "expiring", "expired", "undated"] as const;
type StateFilter = (typeof STATES)[number];
const STATE_LABEL: Record<StateFilter, string> = {
  valid: "Valid",
  expiring: "Expiring ≤90d",
  expired: "Lapsed",
  undated: "Undated",
};

export default async function GraduatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; state?: string }>;
}) {
  await requireAdmin();
  const { q, status, state } = await searchParams;

  // This section shows graduates by default; "ALL" lifts the filter.
  const effective = status ?? "GRADUATE";
  const where: Prisma.GraduateWhereInput = {};
  if (
    effective !== "ALL" &&
    STATUSES.includes(effective as (typeof STATUSES)[number])
  ) {
    where.status = effective as (typeof STATUSES)[number];
  }

  // Validity drill-down (from dashboard KPIs/alerts). Mirrors the analytics
  // buckets: validity = expiresAt vs now; "undated" = no expiry on record.
  const activeState = STATES.includes(state as StateFilter)
    ? (state as StateFilter)
    : null;
  if (activeState) {
    const now = new Date();
    const in90 = new Date(Date.now() + 90 * 86_400_000);
    if (activeState === "valid") where.expiresAt = { gt: now };
    else if (activeState === "expiring")
      where.expiresAt = { gte: now, lte: in90 };
    else if (activeState === "expired") where.expiresAt = { lt: now };
    else where.expiresAt = null;
  }

  if (q?.trim()) {
    where.OR = [
      { lcn: { contains: q.trim(), mode: "insensitive" } },
      { name: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  const graduates = await prisma.graduate.findMany({
    where,
    include: { photo: true },
    orderBy: [{ batchCode: "desc" }, { lcn: "asc" }],
    take: 500,
  });

  // Professor is a batch attribute — map it onto each graduate by batch code.
  const batchProfs = await prisma.batch.findMany({
    select: { code: true, professor: true },
  });
  const profByCode = new Map(
    batchProfs.map((b) => [b.code, b.professor] as const),
  );

  // Global weighted ranking across all graduate-status records. Legacy
  // records have no grade data — shown as "Legacy", never ranked.
  const ranked = await prisma.graduate.findMany({
    where: { status: "GRADUATE", legacy: false },
    select: {
      id: true,
      scoreFWE: true,
      scoreSJE: true,
      scoreEP: true,
      scorePAS: true,
      scoreCCST: true,
      scoreCCSM: true,
      bonusPoints: true,
    },
  });
  const globalRanks = rankGraduates(ranked.map((x) => ({ id: x.id, six: x })));

  const rows: GraduateRow[] = graduates.map((g) => ({
    id: g.id,
    lcn: g.lcn,
    name: displayName(g),
    status: g.status,
    state: verificationState(g),
    batchCode: g.batchCode,
    professor: g.batchCode ? (profByCode.get(g.batchCode) ?? null) : null,
    expirationRaw: g.expirationRaw,
    legacy: g.legacy,
    photoUrl: g.photo?.url ?? null,
    rank: globalRanks.get(g.id)?.rank ?? null,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title="Graduates"
        meta={
          <p>
            {graduates.length} record{graduates.length === 1 ? "" : "s"}
            {activeState && (
              <>
                {" · "}
                {STATE_LABEL[activeState]}{" "}
                <Link
                  href={`/dashboard/graduates?status=${effective}`}
                  className="text-accent hover:underline"
                >
                  clear
                </Link>
              </>
            )}
          </p>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/graduates/recertified">Recertified</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/graduates/new">
                <Plus aria-hidden /> New record
              </Link>
            </Button>
          </>
        }
      />

      <GraduatesDataTable
        rows={rows}
        scope={
          effective === "ARCHIVED" || effective === "ALL"
            ? effective
            : "GRADUATE"
        }
        validityYears={(await getExpiryPolicy()).licenseValidityYears}
      />
    </div>
  );
}
