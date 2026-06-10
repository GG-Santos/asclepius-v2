import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { prisma } from "@/lib/prisma";
import { readTime } from "@/lib/read-time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
  description: "News and updates from the training center.",
};

export const dynamic = "force-dynamic";

function TagChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-on-primary dark:bg-accent dark:text-white"
          : "border border-outline-variant bg-card text-on-surface-variant hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </Link>
  );
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    include: { author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
  });

  const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort();
  const activeTag = tag && allTags.includes(tag) ? tag : null;
  const visible = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts;

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-10 md:px-8">
        <h1 className="text-3xl font-bold text-primary">Blog</h1>
        <p className="mt-2 text-on-surface-variant">
          News and updates from the training center.
        </p>

        {allTags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <TagChip href="/blog" active={!activeTag}>
              All
            </TagChip>
            {allTags.map((t) => (
              <TagChip
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                active={activeTag === t}
              >
                {t}
              </TagChip>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="mt-10 text-sm text-on-surface-variant">
            No posts {activeTag ? `tagged “${activeTag}”` : "published"} yet.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
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
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 360px"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {p.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {p.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
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
                      : ""}{" "}
                    · {readTime(p.content)} min read
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
