"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { BlogActionState } from "@/app/dashboard/blog/actions";
import { PhotoUpload } from "@/components/dashboard/photo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BlogDefaults = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  status?: string;
  coverImage?: string | null;
};

export function BlogForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (
    prev: BlogActionState,
    formData: FormData,
  ) => Promise<BlogActionState>;
  defaults?: BlogDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  const handled = useRef(false);
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success("Post saved.");
      router.push("/dashboard/blog");
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

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
              defaultValue={defaults.title}
              aria-invalid={fe.title ? true : undefined}
            />
            {fe.title && (
              <p className="text-xs font-medium text-error">{fe.title}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={defaults.slug}
                placeholder="auto from title"
              />
            </div>
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
            <Label htmlFor="content">Content (Markdown) *</Label>
            <textarea
              id="content"
              name="content"
              defaultValue={defaults.content}
              rows={14}
              aria-invalid={fe.content ? true : undefined}
              className="rounded border border-outline-variant bg-card px-3 py-2 font-mono text-sm leading-6 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-error"
            />
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
