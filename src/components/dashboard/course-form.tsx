"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CourseActionState } from "@/app/dashboard/courses/actions";
import { UploadInput } from "@/components/dashboard/upload-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Lifecycle (state) is intentionally absent: publishing/archiving go through
// the explicit publish controls, never a form save.
export type CourseDefaults = {
  title?: string;
  slug?: string;
  summary?: string;
  coverImage?: string;
  estimatedMins?: number | null;
  certificateEnabled?: boolean;
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
            <Label htmlFor="estimatedMins">Estimated time (minutes)</Label>
            <Input
              id="estimatedMins"
              name="estimatedMins"
              type="number"
              min={0}
              defaultValue={defaults.estimatedMins ?? undefined}
              placeholder="optional"
            />
          </div>
          <label className="flex items-center gap-2.5 sm:col-span-1">
            <input
              type="checkbox"
              name="certificateEnabled"
              defaultChecked={defaults.certificateEnabled ?? true}
              className="size-4 rounded border-outline-variant accent-accent"
            />
            <span className="text-sm text-on-surface">
              Issue a CE certificate on completion
            </span>
          </label>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="coverImage">Cover image (optional)</Label>
            <UploadInput
              id="coverImage"
              name="coverImage"
              defaultValue={defaults.coverImage}
              accept="image/*"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              name="summary"
              defaultValue={defaults.summary}
              rows={3}
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
