/**
 * Backfill: set legacy automatically (batches ≤ 5) and recompute podium
 * rankings per batch (top 3 by total score → 1/2/3, others 0).
 *   npx tsx scripts/backfill-ranking-legacy.ts
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const prisma = new PrismaClient();
const SCORE_KEYS = [
  "scoreFWE",
  "scoreSJE",
  "scoreEP",
  "scorePAS",
  "scoreCCST",
  "scoreCCSM",
] as const;

function batchNumber(code: string | null): number | null {
  const m = code?.match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

async function main() {
  const all = await prisma.graduate.findMany();

  // 1) legacy ← batch ≤ 5
  let legacyUpdates = 0;
  for (const g of all) {
    const n = batchNumber(g.batchCode);
    const legacy = n !== null && n <= 5;
    if (g.legacy !== legacy) {
      await prisma.graduate.update({ where: { id: g.id }, data: { legacy } });
      legacyUpdates += 1;
    }
  }

  // 2) rankings per batch
  const byBatch = new Map<string, typeof all>();
  for (const g of all) {
    if (g.status === "ARCHIVED" || !g.batchCode) continue;
    const arr = byBatch.get(g.batchCode) ?? [];
    arr.push(g);
    byBatch.set(g.batchCode, arr);
  }

  let rankUpdates = 0;
  for (const [, rows] of byBatch) {
    const totals = rows.map((g) => ({
      id: g.id,
      total: SCORE_KEYS.reduce((s, k) => s + ((g[k] as number | null) ?? 0), 0),
    }));
    const ranked = totals
      .filter((g) => g.total > 0)
      .sort((a, b) => b.total - a.total);
    for (const g of totals) {
      const pos = ranked.findIndex((r) => r.id === g.id);
      const ranking = pos >= 0 && pos < 3 ? pos + 1 : 0;
      await prisma.graduate.update({ where: { id: g.id }, data: { ranking } });
      rankUpdates += 1;
    }
  }

  console.log(
    `✔ Backfill done: legacy updated on ${legacyUpdates} records; rankings recomputed for ${rankUpdates} records across ${byBatch.size} batches.`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
