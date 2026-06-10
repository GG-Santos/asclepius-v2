"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  type CourseActionState,
  updatePage,
} from "@/app/dashboard/courses/actions";
import { RichTextEditor } from "@/components/dashboard/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function PageEditor({
  courseId,
  page,
}: {
  courseId: string;
  page: { id: string; title: string; body: string; state: string };
}) {
  const [state, formAction, pending] = useActionState<
    CourseActionState,
    FormData
  >(updatePage, {});
  const handled = useRef(false);

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success("Page saved.");
      setTimeout(() => {
        handled.current = false;
      }, 100);
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={page.id} />
      <input type="hidden" name="courseId" value={courseId} />

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[260px] flex-1 flex-col gap-1.5">
          <Label htmlFor="p-title">Title</Label>
          <Input id="p-title" name="title" defaultValue={page.title} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-state">Status</Label>
          <Select id="p-state" name="state" defaultValue={page.state}>
            <option value="UNPUBLISHED">Unpublished</option>
            <option value="PUBLISHED">Published</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Content</Label>
        <RichTextEditor name="body" defaultValue={page.body} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save page"}
      </Button>
    </form>
  );
}
