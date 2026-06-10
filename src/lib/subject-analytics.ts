import "server-only";
import { batchNumber, displayName, scoreTotal } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import {
  type BatchSubject,
  type BatchSubjectRow,
  type GlobalSubject,
  type GraduateRecord,
  SUBJECTS,
  type SubjectAnalytics,
  type SubjectKey,
} from "@/lib/subject-meta";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Graduates-only subject performance. Graduate scores are stored as already-
 * weighted points (FWE ≤10 … CCSM ≤25) that sum to the 0–100 Total. We surface
 * two derived measures: proficiency % (points ÷ max × 100) for fair cross-exam
 * ranking and the struggle flag (below the global %), and the raw points for the
 * stacked breakdown of the Total. Outlier analysis uses the per-graduate list.
 */
export async function getSubjectAnalytics(): Promise<SubjectAnalytics> {
  const grads = await prisma.graduate.findMany({
    where: { status: "GRADUATE" },
    select: {
      id: true,
      lcn: true,
      name: true,
      batchCode: true,
      scoreFWE: true,
      scoreSJE: true,
      scoreEP: true,
      scorePAS: true,
      scoreCCST: true,
      scoreCCSM: true,
    },
  });

  // Only records carrying at least one proficiency score count toward averages.
  const scored = grads.filter((g) =>
    SUBJECTS.some((s) => typeof g[s.key] === "number"),
  );

  // Global per-subject mean points (the baseline every batch is measured against).
  const globalPoint = new Map<SubjectKey, number | null>();
  for (const s of SUBJECTS) {
    let sum = 0;
    let n = 0;
    for (const g of scored) {
      const v = g[s.key];
      if (typeof v === "number") {
        sum += v;
        n++;
      }
    }
    globalPoint.set(s.key, n > 0 ? sum / n : null);
  }
  const globalPct = new Map<SubjectKey, number | null>();
  for (const s of SUBJECTS) {
    const pt = globalPoint.get(s.key);
    globalPct.set(s.key, pt == null ? null : (pt / s.max) * 100);
  }

  const global: GlobalSubject[] = SUBJECTS.map((s) => {
    const pt = globalPoint.get(s.key) ?? null;
    const pct = globalPct.get(s.key) ?? null;
    return {
      ...s,
      avg: pct == null ? null : round1(pct),
      contribution: pt == null ? null : round1(pt),
    };
  });

  const globalRanked = [...global].sort(
    (a, b) =>
      (a.avg ?? Number.POSITIVE_INFINITY) - (b.avg ?? Number.POSITIVE_INFINITY),
  );
  const withAvg = global.filter((g) => g.avg != null);
  const weakest = withAvg.length
    ? withAvg.reduce((m, g) => ((g.avg ?? 0) < (m.avg ?? 0) ? g : m))
    : null;
  const strongest = withAvg.length
    ? withAvg.reduce((m, g) => ((g.avg ?? 0) > (m.avg ?? 0) ? g : m))
    : null;

  const totals = scored
    .map((g) => scoreTotal(g))
    .filter((t): t is number => t != null);
  const avgTotal = totals.length
    ? round1(totals.reduce((a, b) => a + b, 0) / totals.length)
    : null;
  const passRate = totals.length
    ? round1((totals.filter((t) => t >= 70).length / totals.length) * 100)
    : null;

  // Group by batch, then average each subject within the batch.
  const byBatch = new Map<string, typeof scored>();
  for (const g of scored) {
    const b = g.batchCode ?? "—";
    const arr = byBatch.get(b) ?? [];
    arr.push(g);
    byBatch.set(b, arr);
  }

  const batches: BatchSubjectRow[] = [...byBatch.entries()]
    .map(([batch, list]) => {
      const subjects = {} as Record<SubjectKey, BatchSubject>;
      for (const s of SUBJECTS) {
        let sum = 0;
        let n = 0;
        for (const g of list) {
          const v = g[s.key];
          if (typeof v === "number") {
            sum += v;
            n++;
          }
        }
        const pt = n > 0 ? sum / n : null;
        const pct = pt == null ? null : (pt / s.max) * 100;
        const gPct = globalPct.get(s.key) ?? null;
        subjects[s.key] = {
          avg: pct == null ? null : round1(pct),
          contribution: pt == null ? null : round1(pt),
          belowGlobal: pct != null && gPct != null && pct < gPct,
        };
      }
      const bt = list
        .map((g) => scoreTotal(g))
        .filter((t): t is number => t != null);
      return {
        batch,
        batchNo: batchNumber(batch),
        count: list.length,
        total: bt.length
          ? round1(bt.reduce((a, b) => a + b, 0) / bt.length)
          : null,
        passRate: bt.length
          ? round1((bt.filter((t) => t >= 70).length / bt.length) * 100)
          : null,
        subjects,
      };
    })
    .sort((a, b) => (a.batchNo ?? 9999) - (b.batchNo ?? 9999));

  const graduates: GraduateRecord[] = scored.map((g) => {
    const pct = {} as Record<SubjectKey, number | null>;
    for (const s of SUBJECTS) {
      const v = g[s.key];
      pct[s.key] = typeof v === "number" ? round1((v / s.max) * 100) : null;
    }
    return {
      id: g.id,
      lcn: g.lcn,
      name: displayName(g),
      batch: g.batchCode ?? "—",
      batchNo: batchNumber(g.batchCode),
      total: scoreTotal(g) ?? 0,
      pct,
    };
  });

  return {
    graduateCount: scored.length,
    avgTotal,
    passRate,
    global,
    globalRanked,
    weakest,
    strongest,
    batches,
    graduates,
  };
}
