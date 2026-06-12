import { FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canAuthorPosts } from "@/lib/blog-permission";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export const metadata: Metadata = { title: "My Posts" };

export default async function MyPostsPage() {
  const { session } = await requireGraduate();
  if (!(await canAuthorPosts(session))) redirect("/portal");

  const posts = await prisma.blogPost.findMany({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      updatedAt: true,
      publishedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">My Posts</h1>
          <p className="text-sm text-on-surface-variant">
            Drafts are reviewed and published by the training center.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/portal/posts/new">
            <Plus aria-hidden /> New post
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-sm text-on-surface-variant">
            <FileText className="size-8 text-on-surface-variant/40" />
            You haven't written anything yet — start your first post.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/portal/posts/${p.id}/edit`}
                className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-card p-4 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/[0.08]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-on-surface">
                    {p.title}
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    Updated {p.updatedAt.toLocaleDateString()}
                  </span>
                </span>
                <Badge
                  variant={p.status === "PUBLISHED" ? "verified" : "neutral"}
                >
                  {p.status === "PUBLISHED" ? "Published" : "Draft"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
