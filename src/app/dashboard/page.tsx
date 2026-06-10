import {
  CalendarClock,
  CircleCheck,
  CircleX,
  FileText,
  GraduationCap,
  Search,
  ShieldX,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { type KpiDelta, KpiStat } from "@/components/dashboard/kpi-stat";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { PageHeader } from "@/components/dashboard/page-header";
import { RangePicker } from "@/components/dashboard/range-picker";
import { SubjectPerformance } from "@/components/dashboard/subject-performance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AdminAnalytics,
  getAdminAnalytics,
  normalizeRange,
} from "@/lib/analytics";
import { buildAlerts } from "@/lib/dashboard-insights";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getSubjectAnalytics } from "@/lib/subject-analytics";
import type { SubjectAnalytics } from "@/lib/subject-meta";

export default async function DashboardOverview({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; range?: string }>;
}) {
  const session = await getSession();
  const { denied, range } = await searchParams;
  const role = session?.user.role ?? "writer";
  const firstName = session?.user.name?.split(" ")[0] ?? "there";

  if (role === "professor") {
    const myBatches = await prisma.batch.findMany({
      where: { professorId: session?.user.id },
      orderBy: { code: "desc" },
      include: { _count: { select: { students: true, graduates: true } } },
    });
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <PageHeader
          title={`Welcome back, ${firstName}`}
          meta={<p>Your assigned batches.</p>}
        />
        {myBatches.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-on-surface-variant">
              No batches assigned to you yet. An administrator will add you to a
              batch.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myBatches.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/batches/${b.id}`}
                className="rounded-xl border border-outline-variant/60 bg-card p-5 shadow-[var(--shadow-clinical)] transition-shadow hover:shadow-[var(--shadow-clinical-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-on-surface">
                    {b.batchNumber ? `Batch ${b.batchNumber}` : b.code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      b.graduated
                        ? "bg-success/15 text-success"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {b.graduated ? "Graduated" : "In training"}
                  </span>
                </div>
                {b.label && (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {b.label}
                  </p>
                )}
                <p className="tabular mt-3 text-sm text-on-surface-variant">
                  {b._count.students} students · {b._count.graduates} graduates
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-[1000px] space-y-6">
        <PageHeader
          title={`Welcome back, ${firstName}`}
          meta={<p>Write and manage blog posts.</p>}
        />
        <Link href="/dashboard/blog" className="block max-w-sm">
          <Card className="transition-shadow hover:shadow-[var(--shadow-clinical-md)]">
            <CardHeader>
              <FileText className="size-6 text-accent" />
              <CardTitle>Blog</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-on-surface-variant">
              Draft and publish articles for the public site.
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  }

  const r = normalizeRange(range);
  // Kick both fetches off immediately, but do NOT await here: each zone below
  // awaits the shared promise inside its own Suspense boundary, so the shell
  // (header, actions) paints instantly and every zone shows its own skeleton
  // while resolving (R4).
  const analyticsPromise = getAdminAnalytics(r);
  const subjectPromise = getSubjectAnalytics();

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      {/* Zone 0 — control bar: title + time range + primary actions */}
      <PageHeader
        title={`Welcome back, ${firstName}`}
        meta={<p>Registry &amp; verification analytics.</p>}
        actions={
          <>
            <RangePicker value={r} />
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/graduates/new">Add graduate</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/students/new">Add student</Link>
            </Button>
          </>
        }
      />

      <div className="ekg-divider" aria-hidden />

      {denied && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-warning">
            <TriangleAlert className="size-5 shrink-0" />
            <span>That area is restricted to administrators.</span>
          </CardContent>
        </Card>
      )}

      {/* Zone 1 — cohort performance by subject (the priority view) */}
      <Suspense fallback={<SubjectZoneSkeleton />}>
        <SubjectZone subjectPromise={subjectPromise} />
      </Suspense>

      {/* Zone 2 — hero KPIs (value + comparison + tone + plain-language reading) */}
      <Suspense fallback={<KpiZoneSkeleton />}>
        <KpiZone analyticsPromise={analyticsPromise} rangeDays={r} />
      </Suspense>

      {/* Zone 3 — needs attention worklist */}
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <AttentionZone analyticsPromise={analyticsPromise} />
      </Suspense>

      {/* Zone 4 — expiring queue + recent verification activity */}
      <Suspense fallback={<ListsZoneSkeleton />}>
        <ListsZone analyticsPromise={analyticsPromise} />
      </Suspense>
    </div>
  );
}

/* ───────────────────────── zones (server components) ───────────────────── */

async function SubjectZone({
  subjectPromise,
}: {
  subjectPromise: Promise<SubjectAnalytics>;
}) {
  const subj = await subjectPromise;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Cohort performance by subject
        </CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">
          Where graduates are strong and where they struggle — across every
          exam, globally and per batch.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SubjectStat
            label="Avg Total Evaluation"
            value={subj.avgTotal != null ? `${subj.avgTotal}` : "—"}
          />
          <SubjectStat
            label="Weakest subject"
            value={
              subj.weakest ? `${subj.weakest.short} · ${subj.weakest.avg}` : "—"
            }
            tone="warning"
          />
        </div>
        <SubjectPerformance data={subj} />
      </CardContent>
    </Card>
  );
}

async function KpiZone({
  analyticsPromise,
  rangeDays,
}: {
  analyticsPromise: Promise<AdminAnalytics>;
  rangeDays: number;
}) {
  const a = await analyticsPromise;
  const v = a.verification;

  const foundRateDelta: KpiDelta | null =
    v.foundRateDeltaPts == null
      ? null
      : {
          text: `${Math.abs(v.foundRateDeltaPts)} pts vs prior ${rangeDays}d`,
          direction:
            v.foundRateDeltaPts > 0
              ? "up"
              : v.foundRateDeltaPts < 0
                ? "down"
                : "flat",
          good: v.foundRateDeltaPts === 0 ? null : v.foundRateDeltaPts > 0,
        };

  const validPct =
    a.totals.graduates > 0
      ? Math.round((a.totals.validLicenses / a.totals.graduates) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiStat
        icon={GraduationCap}
        label="Active valid licenses"
        value={a.totals.validLicenses}
        context={`${validPct}% of ${a.totals.graduates.toLocaleString()} records`}
        reading={
          validPct >= 90
            ? "Healthy — nearly every record holds a valid license."
            : validPct >= 70
              ? "Mostly healthy — a noticeable share has lapsed."
              : "Needs attention — many records lack a valid license."
        }
        tone="success"
        href="/dashboard/graduates?status=GRADUATE&state=valid"
      />
      <KpiStat
        icon={ShieldX}
        label="Lapsed but listed"
        value={a.totals.lapsedListed}
        context="publicly shown as valid"
        reading={
          a.totals.lapsedListed === 0
            ? "All clear — the public registry shows nothing it shouldn't."
            : "Fix now — these look valid to the public but are not."
        }
        tone="critical"
        badge={a.totals.lapsedListed > 0 ? "P0" : undefined}
        href="/dashboard/graduates?status=GRADUATE&state=expired"
      />
      <KpiStat
        icon={CalendarClock}
        label="Expiring ≤ 90 days"
        value={a.totals.expiring90}
        context={`${a.totals.expiring30} within 30 days`}
        reading={
          a.totals.expiring90 === 0
            ? "Quiet — no renewals due in the next 90 days."
            : a.totals.expiring30 > 0
              ? "Plan renewals — some come due within a month."
              : "Heads-up — renewals are coming, none urgent yet."
        }
        tone="warning"
        href="/dashboard/graduates?status=GRADUATE&state=expiring"
      />
      <KpiStat
        icon={Search}
        label={`Found-rate (${rangeDays}d)`}
        value={v.foundRate != null ? `${v.foundRate}%` : "—"}
        context={`of ${v.volume.toLocaleString()} verifications`}
        reading={
          v.foundRate == null
            ? "No lookups in this period yet."
            : v.foundRate >= 95
              ? "Strong — almost every public lookup finds its license."
              : v.foundRate >= 80
                ? "Good — most lookups resolve; a few come back empty."
                : "Investigate — many public lookups find nothing."
        }
        tone="accent"
        delta={foundRateDelta}
        sparkline={a.lookupSeries.map((p) => p.found + p.notFound)}
      />
    </div>
  );
}

async function AttentionZone({
  analyticsPromise,
}: {
  analyticsPromise: Promise<AdminAnalytics>;
}) {
  const a = await analyticsPromise;
  return <NeedsAttention alerts={buildAlerts(a)} />;
}

async function ListsZone({
  analyticsPromise,
}: {
  analyticsPromise: Promise<AdminAnalytics>;
}) {
  const a = await analyticsPromise;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Expiring soon</CardTitle>
          <Link
            href="/dashboard/graduates?status=GRADUATE&state=expiring"
            className="text-xs font-medium text-accent hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {a.expiringList.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              No credentials expiring in the next 90 days.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/40">
              {a.expiringList.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/dashboard/graduates/${e.id}/edit`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent"
                  >
                    <span className="min-w-0 truncate font-medium text-on-surface">
                      {e.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-xs text-on-surface-variant">
                        {e.lcn}
                      </span>
                      <span className="text-xs text-secondary">
                        {e.expirationRaw ?? "—"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent verifications</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {a.recentLookups.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              No verification lookups yet.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/40">
              {a.recentLookups.map((row, i) => (
                <li
                  key={`${row.lcn}-${row.at}-${i}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {row.found ? (
                      <CircleCheck className="size-4 text-success" />
                    ) : (
                      <CircleX className="size-4 text-secondary" />
                    )}
                    <span className="tabular text-xs text-on-surface">
                      {row.lcn}
                    </span>
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {new Date(row.at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────────────────────── skeletons + bits ────────────────────────────── */

function SubjectZoneSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-56 w-full" />
      </CardContent>
    </Card>
  );
}

function KpiZoneSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => `kpi-skel-${i}`).map((k) => (
        <Skeleton key={k} className="h-40" />
      ))}
    </div>
  );
}

function ListsZoneSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-56" />
      <Skeleton className="h-56" />
    </div>
  );
}

function SubjectStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning";
}) {
  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-low p-3">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p
        className={`tabular mt-1 text-lg font-semibold ${
          tone === "warning" ? "text-warning" : "text-on-surface"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
