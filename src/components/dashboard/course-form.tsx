"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CourseActionState } from "@/app/dashboard/courses/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CourseDefaults = {
  title?: string;
  slug?: string;
  summary?: string;
  coverImage?: string;
  status?: string;
};

export function CourseForm({
  action,
  defaults = {},
  submitLabel,
  showSuccessToast = false,
}: {
  action: (
    prev: CourseActionState,
    formData: FormData,
  ) => Promise<CourseActionState>;
  defaults?: CourseDefaults;
  submitLabel: string;
  showSuccessToast?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (state.ok && showSuccessToast && !handled.current) {
      handled.current = true;
      toast.success("Course saved.");
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router, showSuccessToast]);

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" defaultValue={defaults.title} />
          </div>
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
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="coverImage">Cover image URL (optional)</Label>
            <Input
              id="coverImage"
              name="coverImage"
              defaultValue={defaults.coverImage}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="summary">Summary</Label>
            <textarea
              id="summary"
              name="summary"
              defaultValue={defaults.summary}
              rows={3}
              className="rounded border border-outline-variant bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard/courses">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
