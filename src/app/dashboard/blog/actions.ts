"use server";

import { revalidatePath } from "next/cache";
import { uploadImage } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type BlogActionState = {
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

// TipTap serializes an empty doc as "<p></p>" — strip tags to detect blank.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 2;
  // Loop until we find a slug not used by a different post.
  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

async function coverFromForm(
  formData: FormData,
  uploadedBy: string,
): Promise<string | undefined> {
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const asset = await uploadImage(cover, { folder: "blog", uploadedBy });
    return asset.url;
  }
  return undefined;
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
    status:
      String(formData.get("status") ?? "DRAFT") === "PUBLISHED"
        ? "PUBLISHED"
        : "DRAFT",
  } as const;
}

export async function createPost(
  _prev: BlogActionState,
  formData: FormData,
): Promise<BlogActionState> {
  const session = await requireUser();
  const f = readFields(formData);
  const fieldErrors: Record<string, string> = {};
  if (!f.title) fieldErrors.title = "Title is required.";
  if (!stripHtml(f.content)) fieldErrors.content = "Content is required.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const slug = await uniqueSlug(slugify(f.slugInput || f.title));
  const coverImage = await coverFromForm(formData, session.user.id);

  await prisma.blogPost.create({
    data: {
      title: f.title,
      slug,
      excerpt: f.excerpt || null,
      content: f.content,
      tags: [...f.tags],
      status: f.status,
      coverImage: coverImage ?? null,
      authorId: session.user.id,
      publishedAt: f.status === "PUBLISHED" ? new Date() : null,
    },
  });

  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  return { ok: true };
}

export async function updatePost(
  id: string,
  _prev: BlogActionState,
  formData: FormData,
): Promise<BlogActionState> {
  const session = await requireUser();
  const f = readFields(formData);
  const fieldErrors: Record<string, string> = {};
  if (!f.title) fieldErrors.title = "Title is required.";
  if (!stripHtml(f.content)) fieldErrors.content = "Content is required.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const current = await prisma.blogPost.findUnique({ where: { id } });
  if (!current) return { error: "Post not found." };

  const slug = await uniqueSlug(slugify(f.slugInput || f.title), id);
  const coverImage = await coverFromForm(formData, session.user.id);
  const becomingPublished =
    f.status === "PUBLISHED" && current.status !== "PUBLISHED";

  await prisma.blogPost.update({
    where: { id },
    data: {
      title: f.title,
      slug,
      excerpt: f.excerpt || null,
      content: f.content,
      tags: [...f.tags],
      status: f.status,
      ...(coverImage ? { coverImage } : {}),
      publishedAt: becomingPublished
        ? new Date()
        : f.status === "PUBLISHED"
          ? current.publishedAt
          : null,
    },
  });

  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  return { ok: true };
}

export async function deletePost(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.blogPost.delete({ where: { id } });
    revalidatePath("/dashboard/blog");
    revalidatePath("/blog");
  }
}
