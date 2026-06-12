// One-time backfill: renewals performed BEFORE recertifiedAt existed have no
// stamp. A renewal's signature: registeredAt (= previous expiry) is set AND
// expiresAt is ~1 year after it AND the record was touched recently. Stamps
// recertifiedAt = updatedAt for matches in the last 48h.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 86_400_000;

async function main() {
  const since = new Date(Date.now() - 2 * DAY);
  const candidates = await prisma.graduate.findMany({
    where: {
      // Mongo: pre-feature documents have the field MISSING, not null —
      // Prisma's `null` filter doesn't match those; `isSet: false` does.
      OR: [{ recertifiedAt: null }, { recertifiedAt: { isSet: false } }],
      registeredAt: { not: null },
      expiresAt: { not: null },
      updatedAt: { gte: since },
      status: "GRADUATE",
    },
    select: {
      id: true,
      lcn: true,
      registeredAt: true,
      expiresAt: true,
      updatedAt: true,
    },
  });

  let stamped = 0;
  for (const g of candidates) {
    if (!g.registeredAt || !g.expiresAt) continue;
    const expected = new Date(g.registeredAt);
    expected.setFullYear(expected.getFullYear() + 1);
    const drift = Math.abs(g.expiresAt.getTime() - expected.getTime());
    if (drift > DAY) continue; // not a renewal signature
    await prisma.graduate.update({
      where: { id: g.id },
      data: { recertifiedAt: g.updatedAt },
    });
    stamped += 1;
    console.log(
      `stamped ${g.lcn}: recertifiedAt = ${g.updatedAt.toISOString()}`,
    );
  }
  console.log(
    `Backfill complete: ${stamped} of ${candidates.length} candidate(s) stamped.`,
  );
}

main().finally(() => prisma.$disconnect());
