import "server-only";
import { batchNumber, displayName, verificationState } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const round1 = (n: number) => Math.round(n * 10) / 10;

export type Range = 7 | 30 | 90;
const RANGES: Range[] = [7, 30, 90];
export const normalizeRange = (v: unknown): Range => {
  const n = Number(v);
  return (RANGES as number[]).includes(n) ? (n as Range) : 30;
};

/** One day of verification traffic. `rate` is the found-% for the day (null if
 *  no lookups). `prevTotal` is the same day-offset in the prior window — the
 *  ghost-comparison series the trend chart overlays. */
export type LookupPoint = {
  date: string;
  found: number;
  notFound: number;
  rate: number | null;
  prevTotal: number;
};
export type BatchPoint = { batch: string; count: number };
export type StatusSlice = { key: string; label: string; value: number };
export type ExpiringRow = {
  id: string;
  lcn: string;
  name: string;
  expirationRaw: string | null;
};
export type RecentLookup = { lcn: string; found: boolean; at: string };
export type NotFoundRow = { lcn: string; count: number };

export type AdminAnalytics = {
  range: Range;
  totals: {
    // Corrected credential metrics (validity = expiresAt vs now, not status).
    validLicenses: number; // GRADUATE ∧ expiresAt > now (incl. expiring-soon)
    lapsedListed: number; // GRADUATE ∧ expiresAt < now — publicly shown valid
    undated: number; // GRADUATE ∧ expiresAt = null — cannot be verified
    expiring30: number; // GRADUATE ∧ now < expiresAt ≤ +30d (cumulative)
    expiring60: number;
    expiring90: number;
    graduates: number; // all GRADUATE-status records (valid+lapsed+undated)
    archived: number;
    batches: number;
    // Legacy aliases — consumed by the pre-rebuild page until Wave 4 swaps it.
    licensed: number;
    students: number;
    expiringSoon: number;
  };
  pipeline: { inTraining: number; graduated: number; withdrawn: number };
  verification: {
    volume: number;
    volumePrev: number;
    volumeDeltaPct: number | null;
    foundRate: number | null; // 0–100, current window
    foundRatePrev: number | null;
    foundRateDeltaPts: number | null; // percentage-point change
  };
  statusComposition: StatusSlice[];
  lookupSeries: LookupPoint[];
  batchSeries: BatchPoint[];
  expiringList: ExpiringRow[];
  recentLookups: RecentLookup[];
  notFoundTop: NotFoundRow[];
  inquiriesNew: number;
  posts: { published: number; draft: number };
  lookups30d: number; // legacy alias (= volume over range)
};

export async function getAdminAnalytics(
  range: Range = 30,
): Promise<AdminAnalytics> {
  const nowD = new Date();
  const now = nowD.getTime();
  const sinceCur = now - range * DAY;
  const sincePrior = now - 2 * range * DAY;
  const in90D = new Date(now + 90 * DAY);

  const [
    grads,
    lookups,
    expiringRows,
    recentRows,
    students,
    inquiriesNew,
    postsByStatus,
    batches,
  ] = await Promise.all([
    // One lightweight projection drives every credential metric below.
    prisma.graduate.findMany({
      select: { status: true, expiresAt: true, batchCode: true },
    }),
    // Two windows (current + prior) in one read for delta + ghost series.
    prisma.lookupEvent.findMany({
      where: { createdAt: { gte: new Date(sincePrior) } },
      select: { createdAt: true, found: true, lcn: true },
    }),
    prisma.graduate.findMany({
      where: { status: "GRADUATE", expiresAt: { gte: nowD, lte: in90D } },
      orderBy: { expiresAt: "asc" },
      take: 6,
      select: { id: true, lcn: true, name: true, expirationRaw: true },
    }),
    prisma.lookupEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { lcn: true, found: true, createdAt: true },
    }),
    prisma.student.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.blogPost.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.batch.count(),
  ]);

  // ── Credential validity buckets (reuse verificationState as source of truth) ──
  const comp = { valid: 0, expiring: 0, lapsed: 0, undated: 0, archived: 0 };
  let expiring30 = 0;
  let expiring60 = 0;
  const in60 = now + 60 * DAY;
  const in90 = now + 90 * DAY;
  const in30 = now + 30 * DAY;
  const batchMap = new Map<string, number>();

  for (const g of grads) {
    if (g.batchCode)
      batchMap.set(g.batchCode, (batchMap.get(g.batchCode) ?? 0) + 1);
    const state = verificationState({
      status: g.status,
      expiresAt: g.expiresAt,
    });
    if (state === "archived") {
      comp.archived++;
      continue;
    }
    if (state === "expired") {
      comp.lapsed++;
      continue;
    }
    // state === "verified" — but an undated record is "verified" only by default.
    if (g.expiresAt == null) {
      comp.undated++;
      continue;
    }
    const e = g.expiresAt.getTime();
    if (e <= in90) {
      comp.expiring++;
      if (e <= in30) expiring30++;
      if (e <= in60) expiring60++;
    } else {
      comp.valid++;
    }
  }
  const validLicenses = comp.valid + comp.expiring;
  const graduates = comp.valid + comp.expiring + comp.lapsed + comp.undated;

  const statusComposition: StatusSlice[] = [
    { key: "valid", label: "Valid", value: comp.valid },
    { key: "expiring", label: "Expiring ≤90d", value: comp.expiring },
    { key: "lapsed", label: "Lapsed", value: comp.lapsed },
    { key: "undated", label: "Undated", value: comp.undated },
    { key: "archived", label: "Archived", value: comp.archived },
  ];

  const batchSeries: BatchPoint[] = [...batchMap.entries()]
    .map(([batch, count]) => ({ batch, count }))
    .sort((a, b) => {
      const na = batchNumber(a.batch) ?? 9999;
      const nb = batchNumber(b.batch) ?? 9999;
      if (na !== nb) return na - nb;
      return a.batch < b.batch ? -1 : a.batch > b.batch ? 1 : 0;
    });

  // ── Verification windows: totals, deltas, daily series + prior-period ghost ──
  const series: LookupPoint[] = [];
  const curIdx = new Map<string, number>();
  const priorIdx = new Map<string, number>();
  for (let i = range - 1, k = 0; i >= 0; i--, k++) {
    const d = new Date(now - i * DAY);
    series.push({
      date: dayKey(d).slice(5),
      found: 0,
      notFound: 0,
      rate: null,
      prevTotal: 0,
    });
    curIdx.set(dayKey(d), k);
    priorIdx.set(dayKey(new Date(now - (i + range) * DAY)), k);
  }

  let volume = 0;
  let volumePrev = 0;
  let foundCur = 0;
  let foundPrev = 0;
  const notFound = new Map<string, number>();
  for (const l of lookups) {
    const t = l.createdAt.getTime();
    if (t >= sinceCur) {
      volume++;
      if (l.found) foundCur++;
      else notFound.set(l.lcn, (notFound.get(l.lcn) ?? 0) + 1);
      const ci = curIdx.get(dayKey(l.createdAt));
      if (ci !== undefined) {
        if (l.found) series[ci].found++;
        else series[ci].notFound++;
      }
    } else if (t >= sincePrior) {
      volumePrev++;
      if (l.found) foundPrev++;
      const pi = priorIdx.get(dayKey(l.createdAt));
      if (pi !== undefined) series[pi].prevTotal++;
    }
  }
  for (const p of series) {
    const tot = p.found + p.notFound;
    p.rate = tot > 0 ? Math.round((p.found / tot) * 100) : null;
  }

  const foundRate = volume > 0 ? round1((foundCur / volume) * 100) : null;
  const foundRatePrev =
    volumePrev > 0 ? round1((foundPrev / volumePrev) * 100) : null;
  const foundRateDeltaPts =
    foundRate != null && foundRatePrev != null
      ? round1(foundRate - foundRatePrev)
      : null;
  const volumeDeltaPct =
    volumePrev > 0
      ? Math.round(((volume - volumePrev) / volumePrev) * 100)
      : null;

  const notFoundTop: NotFoundRow[] = [...notFound.entries()]
    .map(([lcn, count]) => ({ lcn, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const sCount = (s: string) =>
    students.find((x) => x.status === s)?._count._all ?? 0;
  const pCount = (s: string) =>
    postsByStatus.find((x) => x.status === s)?._count._all ?? 0;

  return {
    range,
    totals: {
      validLicenses,
      lapsedListed: comp.lapsed,
      undated: comp.undated,
      expiring30,
      expiring60,
      expiring90: comp.expiring,
      graduates,
      archived: comp.archived,
      batches,
      licensed: validLicenses,
      students: sCount("IN_TRAINING"),
      expiringSoon: comp.expiring,
    },
    pipeline: {
      inTraining: sCount("IN_TRAINING"),
      graduated: sCount("GRADUATED"),
      withdrawn: sCount("WITHDRAWN"),
    },
    verification: {
      volume,
      volumePrev,
      volumeDeltaPct,
      foundRate,
      foundRatePrev,
      foundRateDeltaPts,
    },
    statusComposition,
    lookupSeries: series,
    batchSeries,
    expiringList: expiringRows.map((g) => ({
      id: g.id,
      lcn: g.lcn,
      name: displayName(g),
      expirationRaw: g.expirationRaw,
    })),
    recentLookups: recentRows.map((r) => ({
      lcn: r.lcn,
      found: r.found,
      at: r.createdAt.toISOString(),
    })),
    notFoundTop,
    inquiriesNew,
    posts: { published: pCount("PUBLISHED"), draft: pCount("DRAFT") },
    lookups30d: volume,
  };
}
