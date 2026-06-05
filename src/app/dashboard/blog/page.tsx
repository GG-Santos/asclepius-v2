import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { deletePost } from "@/app/dashboard/blog/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function BlogDashboardPage() {
  await requireUser();

  const posts = await prisma.blogPost.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Blog</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {posts.length} post{posts.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/blog/new">
            <Plus aria-hidden /> New post
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-outline-variant/60 bg-card p-10 text-center text-sm text-on-surface-variant">
          No posts yet. Write your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-primary text-on-primary">
                <th className="px-3 py-2 text-left font-semibold">Title</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Author</th>
                <th className="px-3 py-2 text-left font-semibold">Updated</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr
                  key={p.id}
                  className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low"
                >
                  <td className="px-3 py-2 font-medium text-on-surface">
                    {p.title}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        p.status === "PUBLISHED" ? "verified" : "neutral"
                      }
                    >
                      {p.status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {p.author.name}
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {p.updatedAt.toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/blog/${p.id}/edit`}
                        className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <form action={deletePost}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          title="Delete"
                          className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
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
