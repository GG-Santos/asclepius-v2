import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateMyPost } from "@/app/portal/(app)/posts/actions";
import { BlogForm } from "@/components/dashboard/blog-form";
import { canAuthorPosts } from "@/lib/blog-permission";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditMyPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { session } = await requireGraduate();
  if (!(await canAuthorPosts(session))) redirect("/portal");
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  // Ownership at the page level too — the action re-checks server-side.
  if (!post || post.authorId !== session.user.id) notFound();

  const allTags = await prisma.blogPost.findMany({ select: { tags: true } });
  const tagSuggestions = [...new Set(allTags.flatMap((p) => p.tags))].sort();
  const action = updateMyPost.bind(null, post.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/portal/posts"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to my posts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-on-surface">Edit post</h1>
        {post.status === "PUBLISHED" && (
          <p className="mt-1 text-sm text-warning">
            Saving changes returns this post to draft until an admin
            re-publishes it.
          </p>
        )}
      </div>
      <BlogForm
        action={action}
        defaults={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? undefined,
          content: post.content,
          status: post.status,
          coverImage: post.coverImage,
          tags: post.tags,
        }}
        submitLabel="Save draft"
        tagSuggestions={tagSuggestions}
        redirectTo="/portal/posts"
        lockStatus
      />
    </div>
  );
}
