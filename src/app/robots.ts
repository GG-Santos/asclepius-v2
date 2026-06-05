import type { MetadataRoute } from "next";

const BASE = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/portal", "/api", "/login"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
