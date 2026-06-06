/**
 * Create or promote an admin account - interactive version.
 *
 * Usage:
 *   npx tsx scripts/create-admin-interactive.ts [email] [password]
 *
 * If email/password are provided as arguments, they are used directly.
 * Otherwise, the script will prompt for them interactively.
 *
 * This script does NOT require .env files to be set up - it can accept
 * DATABASE_URL and BETTER_AUTH_SECRET as command-line arguments or prompts.
 */

import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createInterface } from "readline";

// Helper to create readline interface
function createPrompt() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Helper to prompt for user input
function question(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  const rl = createPrompt();

  try {
    console.log("\n📝 Admin Account Creation\n");

    // Get email from args or prompt
    let email = process.argv[2];
    if (!email) {
      email = await question(rl, "Enter admin email: ");
    }

    if (!email || !email.includes("@")) {
      console.error("❌ Invalid email address");
      process.exit(1);
    }

    // Get password from args or prompt
    let password = process.argv[3];
    if (!password) {
      password = await question(rl, "Enter admin password (min 8 chars): ");
    }

    if (!password || password.length < 8) {
      console.error("❌ Password must be at least 8 characters");
      process.exit(1);
    }

    // Get DATABASE_URL from env or prompt
    let databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      databaseUrl = await question(rl, "Enter DATABASE_URL (MongoDB): ");
    }

    if (!databaseUrl) {
      console.error("❌ DATABASE_URL is required");
      process.exit(1);
    }

    // Get BETTER_AUTH_SECRET from env or prompt
    let authSecret = process.env.BETTER_AUTH_SECRET;
    if (!authSecret) {
      authSecret = await question(rl, "Enter BETTER_AUTH_SECRET: ");
    }

    if (!authSecret) {
      console.error("❌ BETTER_AUTH_SECRET is required");
      process.exit(1);
    }

    // Get optional name
    const name = process.argv[4] ?? "Administrator";

    rl.close();

    // Set env vars for Prisma
    process.env.DATABASE_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET = authSecret;

    // Initialize Prisma and BetterAuth
    const prisma = new PrismaClient();

    const auth = betterAuth({
      database: prismaAdapter(prisma, { provider: "mongodb" }),
      emailAndPassword: {
        enabled: true,
        disableSignUp: false,
        minPasswordLength: 8,
      },
      advanced: { database: { generateId: false } },
      secret: authSecret,
    });

    console.log("\n⏳ Creating admin account...\n");

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { role: "admin", emailVerified: true },
      });
      console.log(`✅ Promoted existing user to admin: ${email}`);
    } else {
      await auth.api.signUpEmail({ body: { email, password, name } });
      await prisma.user.update({
        where: { email },
        data: { role: "admin", emailVerified: true },
      });
      console.log(`✅ Created new admin account: ${email}`);
    }

    console.log("\n📊 Account Details:");
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: admin`);
    console.log(`\n✔️  Admin account is ready!\n`);

    await prisma.$disconnect();
  } catch (err) {
    console.error("\n❌ Error:", err);
    rl.close();
    process.exit(1);
  }
}

main();
