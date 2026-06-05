import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export type Role = "admin" | "writer" | "graduate";

export const auth = betterAuth({
  appName: "Asclepius",
  database: prismaAdapter(prisma, { provider: "mongodb" }),
  emailAndPassword: {
    enabled: true,
    // No public self-registration. Accounts are created by an admin
    // (or the bootstrap seed). See scripts/create-admin.ts.
    disableSignUp: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "writer",
        // Never let a client set its own role on any auth call.
        input: false,
      },
      // For graduate accounts: the LCN of the Graduate record they own.
      graduateLcn: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
  advanced: {
    database: {
      // Let MongoDB/Prisma generate ObjectId _id values (our schema uses
      // @default(auto()) @db.ObjectId). Without this, BetterAuth emits its own
      // string ids which are not valid ObjectIds.
      generateId: false,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // nextCookies() must be the last plugin so it can attach Set-Cookie
  // headers emitted by server actions.
  plugins: [nextCookies()],
});
