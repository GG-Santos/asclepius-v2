#!/usr/bin/env node
/**
 * Create or promote an admin account - argument-based version.
 *
 * Usage (with all env vars as arguments):
 *   npx tsx scripts/create-admin-env.ts \
 *     --email admin@example.com \
 *     --password SecurePass123 \
 *     --database-url "mongodb://..." \
 *     --auth-secret "your-secret-key" \
 *     --name "Admin Name"
 *
 * Or with environment variables:
 *   ADMIN_EMAIL=admin@example.com \
 *   ADMIN_PASSWORD=SecurePass123 \
 *   DATABASE_URL="mongodb://..." \
 *   BETTER_AUTH_SECRET="your-secret-key" \
 *   npx tsx scripts/create-admin-env.ts
 *
 * This script is ideal for automated deployments and CI/CD pipelines.
 */

import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        parsed[key] = value;
        i++;
      }
    }
  }

  return parsed;
}

// Map argument names to env var names
function getConfig(cliArgs: Record<string, string>) {
  return {
    email: cliArgs["email"] || process.env.ADMIN_EMAIL,
    password: cliArgs["password"] || process.env.ADMIN_PASSWORD,
    databaseUrl:
      cliArgs["database-url"] || cliArgs["db-url"] || process.env.DATABASE_URL,
    authSecret:
      cliArgs["auth-secret"] ||
      cliArgs["secret"] ||
      process.env.BETTER_AUTH_SECRET,
    name: cliArgs["name"] || "Administrator",
  };
}

async function main() {
  const cliArgs = parseArgs();
  const config = getConfig(cliArgs);

  // Validate required fields
  const missing = [];
  if (!config.email) missing.push("email");
  if (!config.password) missing.push("password");
  if (!config.databaseUrl) missing.push("database-url");
  if (!config.authSecret) missing.push("auth-secret");

  if (missing.length > 0) {
    console.error("\n❌ Missing required parameters:");
    missing.forEach((param) => {
      console.error(`   - ${param}`);
    });
    console.error(
      "\nUsage: npx tsx scripts/create-admin-env.ts [options]",
    );
    console.error("\nOptions:");
    console.error("  --email <email>           Admin email address");
    console.error("  --password <password>     Admin password (min 8 chars)");
    console.error("  --database-url <url>      MongoDB connection string");
    console.error("  --auth-secret <secret>    BetterAuth secret key");
    console.error("  --name <name>             Admin name (default: Administrator)");
    console.error("\nOr set environment variables: ADMIN_EMAIL, ADMIN_PASSWORD,");
    console.error("DATABASE_URL, BETTER_AUTH_SECRET\n");
    process.exit(1);
  }

  // Validate email format
  if (!config.email.includes("@")) {
    console.error("❌ Invalid email address");
    process.exit(1);
  }

  // Validate password length
  if (config.password.length < 8) {
    console.error("❌ Password must be at least 8 characters");
    process.exit(1);
  }

  try {
    // Set env vars for Prisma
    process.env.DATABASE_URL = config.databaseUrl;
    process.env.BETTER_AUTH_SECRET = config.authSecret;

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
      secret: config.authSecret,
    });

    console.log("\n⏳ Creating admin account...\n");

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: config.email },
    });

    if (existing) {
      await prisma.user.update({
        where: { email: config.email },
        data: { role: "admin", emailVerified: true },
      });
      console.log(`✅ Promoted existing user to admin: ${config.email}`);
    } else {
      await auth.api.signUpEmail({
        body: {
          email: config.email,
          password: config.password,
          name: config.name,
        },
      });
      await prisma.user.update({
        where: { email: config.email },
        data: { role: "admin", emailVerified: true },
      });
      console.log(`✅ Created new admin account: ${config.email}`);
    }

    console.log("\n📊 Account Details:");
    console.log(`   Email: ${config.email}`);
    console.log(`   Name: ${config.name}`);
    console.log(`   Role: admin`);
    console.log(`\n✔️  Admin account is ready!\n`);

    await prisma.$disconnect();
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  }
}

main();
