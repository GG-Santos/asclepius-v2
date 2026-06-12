"use server";

import { revalidatePath } from "next/cache";
import { canAuthorPosts } from "@/lib/blog-permission";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type PortalPostState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

/**
 * Portal authoring gate (R6): graduate role + admin-granted canBlog, both
 * re-read from the DB at action entry so a revocation applies immediately.
 * Returns the session or null (caller surfaces the rejection).
 */
async function requireBlogGraduate() {
  const session = await getSession();
  if (!session || session.user.role !== "graduate") return null;
  if (!(await canAuthorPosts(session))) return null;
  return session;
}

function readFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    slugInput: String(formData.get("slug") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
    tags: [
      ...new Set(
        formData
          .getAll("tags")
          .map((t) => String(t).trim())
          .filter(Boolean),
      ),
    ],
  } as const;
}

/** Create a post as the signed-in graduate. ALWAYS a draft (R7). */
export async function createMyPost(
  _prev: PortalPostState,
  formData: FormData,
): Promise<PortalPostState> {
  const session = await requireBlogGraduate();
  if (!session) return { error: "You don't have blog access." };

  const f = readFields(formData);
  const fieldErrors: Record<string, string> = {};
  if (!f.title) fieldErrors.title = "Title is required.";
  if (!stripHtml(f.content)) fieldErrors.content = "Content is required.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const slug = await uniqueSlug(slugify(f.slugInput || f.title));
  await prisma.blogPost.create({
    data: {
      title: f.title,
      slug,
      excerpt: f.excerpt || null,
      content: f.content,
      tags: [...f.tags],
      status: "DRAFT", // graduates never publish — an admin does (R7)
      authorId: session.user.id,
      publishedAt: null,
    },
  });

  revalidatePath("/portal/posts");
  revalidatePath("/dashboard/blog");
  return { ok: true };
}

/** Edit the graduate's OWN post. Editing always returns it to draft (R7). */
export async function updateMyPost(
  id: string,
  _prev: PortalPostState,
  formData: FormData,
): Promise<PortalPostState> {
  const session = await requireBlogGraduate();
  if (!session) return { error: "You don't have blog access." };

  const current = await prisma.blogPost.findUnique({ where: { id } });
  if (!current) return { error: "Post not found." };
  // Ownership: graduates may only modify posts they authored.
  if (current.authorId !== session.user.id) {
    return { error: "You can only edit your own posts." };
  }

  const f = readFields(formData);
  const fieldErrors: Record<string, string> = {};
  if (!f.title) fieldErrors.title = "Title is required.";
  if (!stripHtml(f.content)) fieldErrors.content = "Content is required.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const slug = await uniqueSlug(slugify(f.slugInput || f.title), id);
  await prisma.blogPost.update({
    where: { id },
    data: {
      title: f.title,
      slug,
      excerpt: f.excerpt || null,
      content: f.content,
      tags: [...f.tags],
      status: "DRAFT", // edits go back through admin review
      publishedAt: null,
    },
  });

  revalidatePath("/portal/posts");
  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  return { ok: true };
}
