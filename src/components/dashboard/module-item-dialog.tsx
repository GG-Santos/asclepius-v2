"use client";

import { FileText, HelpCircle, Link2, Pencil, Plus, Video } from "lucide-react";
import { useState } from "react";
import { createItem, updateItem } from "@/app/dashboard/courses/actions";
import { UploadInput } from "@/components/dashboard/upload-input";
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
import { Select } from "@/components/ui/select";

const TYPE_OPTIONS = [
  { value: "PAGE", label: "Page (rich content)" },
  { value: "VIDEO", label: "Video (embed URL)" },
  { value: "FILE", label: "File (download URL)" },
  { value: "EXTERNAL_URL", label: "External link" },
  { value: "QUIZ", label: "Quiz (graded)" },
];

const URL_TYPES = new Set(["VIDEO", "FILE", "EXTERNAL_URL"]);

export type ItemValues = {
  id: string;
  title: string;
  type: string;
  url: string | null;
  indent: number;
  state: string;
  completionRequirement: string;
  minScore: number | null;
  estimatedMins: number | null;
};

export function ModuleItemDialog({
  courseId,
  moduleId,
  item,
}: {
  courseId: string;
  moduleId: string;
  item?: ItemValues;
}) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(item);
  const [type, setType] = useState(item?.type ?? "PAGE");
  const [requirement, setRequirement] = useState(
    item?.completionRequirement ?? "MUST_VIEW",
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <button
            type="button"
            title="Edit item"
            className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
          >
            <Pencil className="size-4" />
          </button>
        ) : (
          <Button type="button" variant="outline" size="sm">
            <Plus aria-hidden /> Add item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
        </DialogHeader>
        <form
          action={editing ? updateItem : createItem}
          onSubmit={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="courseId" value={courseId} />
          {editing ? (
            <input type="hidden" name="id" value={item?.id} />
          ) : (
            <input type="hidden" name="moduleId" value={moduleId} />
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="i-title">Title</Label>
            <Input
              id="i-title"
              name="title"
              defaultValue={item?.title}
              required
            />
          </div>

          {!editing && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="i-type">Type</Label>
              <Select
                id="i-type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-on-surface-variant">
                {type === "PAGE" || type === "QUIZ"
                  ? "You'll be taken to the editor after adding."
                  : "Paste the URL below."}
              </p>
            </div>
          )}

          {URL_TYPES.has(type) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="i-url">{type === "FILE" ? "File" : "URL"}</Label>
              {type === "FILE" ? (
                <UploadInput
                  id="i-url"
                  name="url"
                  defaultValue={item?.url ?? ""}
                />
              ) : (
                <Input
                  id="i-url"
                  name="url"
                  type="url"
                  defaultValue={item?.url ?? ""}
                  placeholder="https://…"
                />
              )}
            </div>
          )}

          {editing && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="i-req">Completion requirement</Label>
                  <Select
                    id="i-req"
                    name="completionRequirement"
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                  >
                    <option value="NONE">None (optional)</option>
                    <option value="MUST_VIEW">Must view</option>
                    <option value="MUST_MARK_DONE">Must mark done</option>
                    {item?.type === "QUIZ" && (
                      <option value="MUST_PASS">Must pass</option>
                    )}
                  </Select>
                </div>
                {requirement === "MUST_PASS" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="i-min">Min score % (override)</Label>
                    <Input
                      id="i-min"
                      name="minScore"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={item?.minScore ?? undefined}
                      placeholder="quiz default"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="i-est">Time (min)</Label>
                <Input
                  id="i-est"
                  name="estimatedMins"
                  type="number"
                  min={0}
                  defaultValue={item?.estimatedMins ?? undefined}
                />
              </div>
              <p className="text-xs text-on-surface-variant">
                Publishing is controlled from the curriculum list, not here.
              </p>
              <input type="hidden" name="indent" value={item?.indent ?? 0} />
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save" : "Add item"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Small legend icon for an item type. */
export function ItemTypeIcon({ type }: { type: string }) {
  const cls = "size-4 shrink-0 text-on-surface-variant";
  if (type === "QUIZ") return <HelpCircle className={cls} aria-hidden />;
  if (type === "VIDEO") return <Video className={cls} aria-hidden />;
  if (type === "EXTERNAL_URL") return <Link2 className={cls} aria-hidden />;
  return <FileText className={cls} aria-hidden />;
}
