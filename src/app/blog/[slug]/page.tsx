import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

// Minimal, dependency-free Markdown rendering: headings, list items, paragraphs.
function renderContent(content: string) {
  const blocks = content.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    const key = `${i}:${trimmed.slice(0, 16)}`;
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={key} className="mt-8 text-xl font-bold text-on-surface">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={key} className="mt-8 text-2xl font-bold text-on-surface">
          {trimmed.slice(2)}
        </h2>
      );
    }
    if (trimmed.split("\n").every((l) => l.trim().startsWith("- "))) {
      return (
        <ul
          key={key}
          className="my-4 list-disc space-y-1 pl-6 text-on-surface-variant"
        >
          {trimmed.split("\n").map((l) => (
            <li key={l}>{l.trim().slice(2)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p
        key={key}
        className="my-4 whitespace-pre-line leading-7 text-on-surface-variant"
      >
        {trimmed}
      </p>
    );
  });
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
              : ""}
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
          <div className="mt-6">{renderContent(post.content)}</div>
        </article>
      </main>
    </div>
  );
}
