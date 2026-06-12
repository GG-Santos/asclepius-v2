import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updatePost } from "@/app/dashboard/blog/actions";
import { BlogForm } from "@/components/dashboard/blog-form";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  const allTags = await prisma.blogPost.findMany({ select: { tags: true } });
  const tagSuggestions = [...new Set(allTags.flatMap((p) => p.tags))].sort();

  const action = updatePost.bind(null, post.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/blog"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to blog
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-on-surface">Edit post</h1>
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
        submitLabel="Save changes"
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
}
