/**
 * Create or promote an admin account.
 *
 *   npx tsx scripts/create-admin.ts <email> <password> [name]
 *
 * If the user already exists, it is promoted to admin. Otherwise a new account
 * is created with a correctly hashed password (via BetterAuth) and role=admin.
 *
 * Self-contained (no "@/..." path aliases) so it runs cleanly under tsx.
 */

import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const prisma = new PrismaClient();

// Local auth instance with sign-up enabled, only for provisioning accounts.
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

async function main() {
  const email = process.argv[2] ?? process.env.ADMIN_EMAIL;
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;
  const name = process.argv[4] ?? "Administrator";

  if (!email || !password) {
    console.error(
      "Usage: tsx scripts/create-admin.ts <email> <password> [name]",
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: "admin", emailVerified: true },
    });
    console.log(`✔ Promoted existing user to admin: ${email}`);
  } else {
    await auth.api.signUpEmail({ body: { email, password, name } });
    await prisma.user.update({
      where: { email },
      data: { role: "admin", emailVerified: true },
    });
    console.log(`✔ Created admin account: ${email}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
