import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

/**
 * A separate BetterAuth instance used ONLY for admin-driven account
 * provisioning. The primary `auth` disables public sign-up; this one enables it
 * so an authenticated admin can create staff accounts with correctly hashed
 * passwords. Every caller MUST gate with requireAdmin() first.
 */
export const authProvision = betterAuth({
  database: prismaAdapter(prisma, { provider: "mongodb" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 8,
  },
  advanced: { database: { generateId: false } },
  secret: process.env.BETTER_AUTH_SECRET,
});
