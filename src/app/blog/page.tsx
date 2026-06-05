import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Blog",
  description: "News and updates from the training center.",
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    include: { author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-10 md:px-8">
        <h1 className="text-3xl font-bold text-primary">Blog</h1>
        <p className="mt-2 text-on-surface-variant">
          News and updates from the training center.
        </p>

        {posts.length === 0 ? (
          <p className="mt-10 text-sm text-on-surface-variant">
            No posts published yet.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/blog/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)] transition-shadow hover:shadow-[var(--shadow-clinical-md)]"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-highest">
                  <Image
                    src={
                      p.coverImage ||
                      "/assets/img/generated/blog-cover-default.webp"
                    }
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 360px"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-semibold text-on-surface group-hover:text-accent">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm text-on-surface-variant">
                      {p.excerpt}
                    </p>
                  )}
                  <p className="mt-4 text-xs text-on-surface-variant">
                    {p.author.name}
                    {p.publishedAt
                      ? ` · ${p.publishedAt.toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
