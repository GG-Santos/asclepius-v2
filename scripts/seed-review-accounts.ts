/**
 * Provision throwaway accounts for a design/UX review of the gated LMS pages.
 *
 *   npx tsx scripts/seed-review-accounts.ts
 *
 * Creates an admin (dashboard authoring) and a graduate (portal) account. The
 * graduate is linked to a real, currently-verified Graduate record so the portal
 * gate (requireGraduate) lets it through. Idempotent. Delete the accounts after
 * review with scripts/delete-review-accounts.ts (or by email).
 *
 * Self-contained (no "@/..." aliases) so it runs cleanly under tsx.
 */

import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const prisma = new PrismaClient();
const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mongodb" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 8,
  },
  advanced: { database: { generateId: false } },
  secret: process.env.BETTER_AUTH_SECRET,
});

const ADMIN = {
  email: "review-admin@test.local",
  password: "ReviewPass123",
  name: "Review Admin",
};
const GRAD = {
  email: "review-grad@test.local",
  password: "ReviewPass123",
  name: "Review Graduate",
};

async function ensureAccount(acc: {
  email: string;
  password: string;
  name: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: acc.email },
  });
  if (existing) return existing.id;
  await auth.api.signUpEmail({ body: acc });
  const u = await prisma.user.findUnique({ where: { email: acc.email } });
  return u?.id ?? null;
}

async function main() {
  // Admin.
  const adminId = await ensureAccount(ADMIN);
  if (adminId)
    await prisma.user.update({
      where: { id: adminId },
      data: { role: "admin", emailVerified: true },
    });

  // Pick a currently-verified graduate (GRADUATE status, not expired/archived).
  const now = new Date();
  const grad = await prisma.graduate.findFirst({
    where: {
      status: "GRADUATE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!grad) {
    console.error("No verified graduate found to link a portal account to.");
    process.exit(1);
  }

  const gradId = await ensureAccount(GRAD);
  if (gradId)
    await prisma.user.update({
      where: { id: gradId },
      data: { role: "graduate", graduateLcn: grad.lcn, emailVerified: true },
    });

  console.log("\n── Review accounts ready ─────────────────────────────");
  console.log(`ADMIN  ${ADMIN.email}  /  ${ADMIN.password}   → /login`);
  console.log(`GRAD   ${GRAD.email}  /  ${GRAD.password}   → /portal/login`);
  console.log(
    `       linked to graduate LCN ${grad.lcn} (${grad.name ?? "unnamed"})`,
  );
  console.log("──────────────────────────────────────────────────────\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
