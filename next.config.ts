import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Load these on the server via native require instead of bundling them.
  // BetterAuth pulls in optional Kysely SQLite dialects we don't use (Prisma
  // adapter is configured); bundling them breaks the build. Prisma also prefers
  // to stay external so its engine isn't bundled.
  serverExternalPackages: [
    "better-auth",
    "@better-auth/kysely-adapter",
    "kysely",
    "@prisma/client",
    "prisma",
  ],
  images: {
    remotePatterns: [
      // Vercel Blob public URLs: <store-id>.public.blob.vercel-storage.com
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
    // Some networks resolve the Blob hostname to a NAT64 IPv6 address
    // (64:ff9b::/96), which Next 16 classifies as a private IP and blocks by
    // default. Allow it so Blob-hosted images can be optimized.
    dangerouslyAllowLocalIP: true,
  },
};

export default withMDX(nextConfig);
