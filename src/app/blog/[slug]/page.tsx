import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogModelIslands } from "@/components/blog-model-islands";
import { prisma } from "@/lib/prisma";
import { readTime } from "@/lib/read-time";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true, excerpt: true },
  });
  if (!post) return { title: "Not found" };
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { author: { select: { name: true } } },
  });
  if (!post) notFound();

  // Resolve any embedded 3D models (placeholders -> viewer urls) for hydration.
  const modelSlugs = [...post.content.matchAll(/data-model3d="([^"]+)"/g)].map(
    (m) => m[1],
  );
  const modelRows = modelSlugs.length
    ? await prisma.model3D.findMany({
        where: { slug: { in: modelSlugs }, public: true },
        select: { slug: true, fileUrl: true },
      })
    : [];
  const modelMap = Object.fromEntries(
    modelRows.map((m) => [m.slug, m.fileUrl]),
  );

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-outline-variant/60 border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[760px] items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-primary"
          >
            <ShieldCheck className="size-5 text-accent" aria-hidden /> Asclepius
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
          >
            <ArrowLeft className="size-4" /> All posts
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-10">
        <article>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-on-surface-variant">
            {post.author.name}
            {post.publishedAt
              ? ` · ${post.publishedAt.toLocaleDateString()}`
              : ""}{" "}
            · {readTime(post.content)} min read
          </p>
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-lg bg-surface-highest">
            <Image
              src={
                post.coverImage ||
                "/assets/img/generated/blog-cover-default.webp"
              }
              alt=""
              fill
              className="object-cover"
              sizes="760px"
              priority
            />
          </div>
          {post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div
            className="blog-prose mt-6"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized via sanitizeBlogHtml (DOMPurify)
            dangerouslySetInnerHTML={{
              __html: sanitizeBlogHtml(post.content),
            }}
          />
          {Object.keys(modelMap).length > 0 && (
            <BlogModelIslands models={modelMap} />
          )}
        </article>
      </main>
    </div>
  );
}
