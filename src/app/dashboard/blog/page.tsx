import { ExternalLink, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { deletePost } from "@/app/dashboard/blog/actions";
import { DeleteActionButton } from "@/components/dashboard/delete-action-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function BlogDashboardPage() {
  await requireUser();

  const posts = await prisma.blogPost.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const published = posts.filter((p) => p.status === "PUBLISHED").length;
  const drafts = posts.length - published;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title="Blog"
        meta={
          <p>
            {posts.length} post{posts.length === 1 ? "" : "s"} · {published}{" "}
            published · {drafts} draft{drafts === 1 ? "" : "s"}
          </p>
        }
        actions={
          <Button asChild>
            <Link href="/dashboard/blog/new">
              <Plus aria-hidden /> New post
            </Link>
          </Button>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={<Pencil aria-hidden />}
          title="No posts yet"
          description="Write your first one — published posts appear on the public site."
          action={
            <Button asChild>
              <Link href="/dashboard/blog/new">
                <Plus aria-hidden /> New post
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface-container text-on-surface">
                <th className="px-4 py-2.5 text-left font-semibold">Title</th>
                <th className="px-4 py-2.5 text-left font-semibold">Tags</th>
                <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold">Author</th>
                <th className="px-4 py-2.5 text-left font-semibold">Updated</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr
                  key={p.id}
                  className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low hover:bg-surface-container/60"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/dashboard/blog/${p.id}/edit`}
                      className="font-medium text-on-surface hover:text-accent"
                    >
                      {p.title}
                    </Link>
                    {p.excerpt && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-on-surface-variant">
                        {p.excerpt}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent"
                        >
                          {t}
                        </span>
                      ))}
                      {p.tags.length > 3 && (
                        <span className="text-[10px] text-on-surface-variant">
                          +{p.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={
                        p.status === "PUBLISHED" ? "verified" : "neutral"
                      }
                    >
                      {p.status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-on-surface-variant">
                    {p.author.name}
                  </td>
                  <td className="px-4 py-2.5 text-on-surface-variant">
                    {p.updatedAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === "PUBLISHED" && (
                        <Link
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                          title="View public post"
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/blog/${p.id}/edit`}
                        className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <DeleteActionButton
                        action={deletePost}
                        id={p.id}
                        title={`Delete "${p.title}"?`}
                        description="This permanently deletes the blog post. This cannot be undone."
                        successMessage="Post deleted."
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
