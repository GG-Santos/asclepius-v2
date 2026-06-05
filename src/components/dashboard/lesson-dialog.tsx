"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { createLesson, updateLesson } from "@/app/dashboard/courses/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LessonValues = {
  id?: string;
  title?: string;
  content?: string;
  durationMins?: number | null;
};

export function LessonDialog({
  courseId,
  moduleId,
  lesson,
}: {
  courseId: string;
  moduleId: string;
  lesson?: LessonValues;
}) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(lesson?.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <button
            type="button"
            title="Edit lesson"
            className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
          >
            <Pencil className="size-4" />
          </button>
        ) : (
          <Button type="button" variant="outline" size="sm">
            <Plus aria-hidden /> Add lesson
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lesson" : "New lesson"}</DialogTitle>
        </DialogHeader>
        <form
          action={editing ? updateLesson : createLesson}
          onSubmit={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="courseId" value={courseId} />
          {editing ? (
            <input type="hidden" name="id" value={lesson?.id} />
          ) : (
            <input type="hidden" name="moduleId" value={moduleId} />
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-title">Title</Label>
            <Input
              id="l-title"
              name="title"
              defaultValue={lesson?.title}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-duration">Duration (minutes, optional)</Label>
            <Input
              id="l-duration"
              name="durationMins"
              type="number"
              defaultValue={lesson?.durationMins ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-content">Content (Markdown)</Label>
            <textarea
              id="l-content"
              name="content"
              defaultValue={lesson?.content}
              rows={12}
              className="rounded border border-outline-variant bg-card px-3 py-2 font-mono text-sm leading-6 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editing ? "Save lesson" : "Add lesson"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
