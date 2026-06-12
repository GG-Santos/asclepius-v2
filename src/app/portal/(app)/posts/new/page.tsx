import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createMyPost } from "@/app/portal/(app)/posts/actions";
import { BlogForm } from "@/components/dashboard/blog-form";
import { canAuthorPosts } from "@/lib/blog-permission";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export const metadata: Metadata = { title: "New post" };

export default async function NewMyPostPage() {
  const { session } = await requireGraduate();
  if (!(await canAuthorPosts(session))) redirect("/portal");

  const allTags = await prisma.blogPost.findMany({ select: { tags: true } });
  const tagSuggestions = [...new Set(allTags.flatMap((p) => p.tags))].sort();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/portal/posts"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to my posts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-on-surface">New post</h1>
      </div>
      <BlogForm
        action={createMyPost}
        submitLabel="Save draft"
        tagSuggestions={tagSuggestions}
        redirectTo="/portal/posts"
        lockStatus
      />
    </div>
  );
}
