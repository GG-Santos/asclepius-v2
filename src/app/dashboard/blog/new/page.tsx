import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createPost } from "@/app/dashboard/blog/actions";
import { BlogForm } from "@/components/dashboard/blog-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function NewPostPage() {
  await requireUser();
  const allTags = await prisma.blogPost.findMany({ select: { tags: true } });
  const tagSuggestions = [...new Set(allTags.flatMap((p) => p.tags))].sort();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/blog"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to blog
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-on-surface">New post</h1>
      </div>
      <BlogForm
        action={createPost}
        submitLabel="Create post"
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
}
