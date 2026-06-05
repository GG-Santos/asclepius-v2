import "server-only";
import { prisma } from "@/lib/prisma";

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export type LookupPoint = { date: string; found: number; notFound: number };
export type BatchPoint = { batch: string; count: number };
export type ExpiringRow = {
  id: string;
  lcn: string;
  name: string;
  expirationRaw: string | null;
};
export type RecentLookup = {
  lcn: string;
  found: boolean;
  at: string;
};

export type AdminAnalytics = {
  totals: {
    graduates: number;
    students: number;
    licensed: number;
    archived: number;
    batches: number;
    expiringSoon: number;
  };
  posts: { published: number; draft: number };
  lookupSeries: LookupPoint[];
  batchSeries: BatchPoint[];
  expiringList: ExpiringRow[];
  recentLookups: RecentLookup[];
  lookups30d: number;
};

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * DAY);
  const since = new Date(now.getTime() - 30 * DAY);

  const [
    byStatus,
    totalGrad,
    studentsInTraining,
    batches,
    expiringSoon,
    postsByStatus,
    lookups,
    perBatch,
    expiringRows,
    recentRows,
  ] = await Promise.all([
    prisma.graduate.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.graduate.count(),
    prisma.student.count({ where: { status: "IN_TRAINING" } }),
    prisma.batch.count(),
    prisma.graduate.count({
      where: { status: "GRADUATE", expiresAt: { gte: now, lte: in90 } },
    }),
    prisma.blogPost.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lookupEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, found: true },
    }),
    prisma.graduate.groupBy({ by: ["batchCode"], _count: { _all: true } }),
    prisma.graduate.findMany({
      where: { status: "GRADUATE", expiresAt: { gte: now, lte: in90 } },
      orderBy: { expiresAt: "asc" },
      take: 6,
      select: { id: true, lcn: true, name: true, expirationRaw: true },
    }),
    prisma.lookupEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { lcn: true, found: true, createdAt: true },
    }),
  ]);

  const statusCount = (s: string) =>
    byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const postCount = (s: string) =>
    postsByStatus.find((b) => b.status === s)?._count._all ?? 0;

  // Bucket lookups into the last 30 days.
  const buckets = new Map<string, LookupPoint>();
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(new Date(now.getTime() - i * DAY));
    buckets.set(k, { date: k.slice(5), found: 0, notFound: 0 });
  }
  for (const l of lookups) {
    const point = buckets.get(dayKey(l.createdAt));
    if (point) {
      if (l.found) point.found += 1;
      else point.notFound += 1;
    }
  }

  const batchSeries: BatchPoint[] = perBatch
    .filter((b): b is typeof b & { batchCode: string } => Boolean(b.batchCode))
    .map((b) => ({ batch: b.batchCode, count: b._count._all }))
    .sort((a, b) => a.batch.localeCompare(b.batch));

  return {
    totals: {
      graduates: totalGrad,
      students: studentsInTraining,
      licensed: statusCount("GRADUATE"),
      archived: statusCount("ARCHIVED"),
      batches,
      expiringSoon,
    },
    posts: { published: postCount("PUBLISHED"), draft: postCount("DRAFT") },
    lookupSeries: [...buckets.values()],
    batchSeries,
    expiringList: expiringRows.map((g) => ({
      id: g.id,
      lcn: g.lcn,
      name: g.name?.trim() || `License ${g.lcn}`,
      expirationRaw: g.expirationRaw,
    })),
    recentLookups: recentRows.map((r) => ({
      lcn: r.lcn,
      found: r.found,
      at: r.createdAt.toISOString(),
    })),
    lookups30d: lookups.length,
  };
}
