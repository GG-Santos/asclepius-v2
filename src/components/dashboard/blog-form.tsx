"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { BlogActionState } from "@/app/dashboard/blog/actions";
import { PhotoUpload } from "@/components/dashboard/photo-upload";
import { RichTextEditor } from "@/components/dashboard/rich-text-editor";
import { TagInput } from "@/components/dashboard/tag-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/slug";

export type BlogDefaults = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  status?: string;
  coverImage?: string | null;
  tags?: string[];
};

export function BlogForm({
  action,
  defaults = {},
  submitLabel,
  tagSuggestions = [],
  redirectTo = "/dashboard/blog",
  lockStatus = false,
}: {
  action: (
    prev: BlogActionState,
    formData: FormData,
  ) => Promise<BlogActionState>;
  defaults?: BlogDefaults;
  submitLabel: string;
  tagSuggestions?: string[];
  redirectTo?: string;
  /** Portal authoring: posts always save as drafts — hide the status picker. */
  lockStatus?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  const handled = useRef(false);
  const fe = state.fieldErrors ?? {};

  const [title, setTitle] = useState(defaults.title ?? "");
  const [slug, setSlug] = useState(defaults.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(defaults.slug));
  const isPublished = defaults.status === "PUBLISHED";

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success("Post saved.");
      router.push(redirectTo);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router, redirectTo]);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded border border-error/40 bg-error/5 px-4 py-2 text-sm font-medium text-error">
          {state.error}
        </p>
      )}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              aria-invalid={fe.title ? true : undefined}
            />
            {fe.title && (
              <p className="text-xs font-medium text-error">{fe.title}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                placeholder="auto from title"
              />
              <p className="text-xs text-on-surface-variant">
                /blog/
                <span className="font-medium text-on-surface">
                  {slug || "…"}
                </span>
                {isPublished && slugEdited && (
                  <span className="ml-2 text-warning">
                    Changing a published slug breaks its old URL.
                  </span>
                )}
              </p>
            </div>
            {lockStatus ? (
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <p className="flex h-11 items-center rounded border border-outline-variant/60 bg-surface-low px-3 text-sm text-on-surface-variant">
                  Saves as a draft — an admin reviews and publishes.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={defaults.status ?? "DRAFT"}
                  className="h-11 rounded border border-outline-variant bg-card px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Input
              id="excerpt"
              name="excerpt"
              defaultValue={defaults.excerpt}
              placeholder="Short summary for the blog list"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tags</Label>
            <TagInput
              name="tags"
              defaultValue={defaults.tags ?? []}
              suggestions={tagSuggestions}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Content *</Label>
            <RichTextEditor name="content" defaultValue={defaults.content} />
            {fe.content && (
              <p className="text-xs font-medium text-error">{fe.content}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cover image</Label>
            <PhotoUpload
              name="cover"
              aspectRatio={16 / 9}
              currentUrl={defaults.coverImage}
              label="cover"
            />
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/blog">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
