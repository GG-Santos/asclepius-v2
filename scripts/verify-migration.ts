/**
 * Verify the reference migration populated MongoDB.
 *   npx tsx scripts/verify-migration.ts
 * Exits non-zero if fewer than the expected minimum of records exist.
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const prisma = new PrismaClient();
const MIN_EXPECTED = 50;

async function main() {
  const [total, legacy, withPhoto, batches, media] = await Promise.all([
    prisma.graduate.count(),
    prisma.graduate.count({ where: { legacy: true } }),
    prisma.graduate.count({ where: { photoId: { not: null } } }),
    prisma.batch.count(),
    prisma.mediaAsset.count(),
  ]);

  console.log(
    `graduates=${total} legacy=${legacy} withPhoto=${withPhoto} batches=${batches} mediaAssets=${media}`,
  );

  await prisma.$disconnect();

  if (total < MIN_EXPECTED) {
    console.error(
      `✘ Expected at least ${MIN_EXPECTED} graduates, found ${total}.`,
    );
    process.exit(1);
  }
  console.log("✔ Migration verified.");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
