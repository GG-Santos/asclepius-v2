/**
 * Remove the throwaway design-review accounts created by
 * scripts/seed-review-accounts.ts.
 *
 *   npx tsx scripts/delete-review-accounts.ts
 *
 * Deletes the two accounts by email (and their sessions/accounts via cascade).
 * Does NOT touch the linked Graduate record.
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const prisma = new PrismaClient();
const EMAILS = ["review-admin@test.local", "review-grad@test.local"];

async function main() {
  const { count } = await prisma.user.deleteMany({
    where: { email: { in: EMAILS } },
  });
  console.log(`Removed ${count} review account(s).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
