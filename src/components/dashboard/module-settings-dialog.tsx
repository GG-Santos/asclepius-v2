"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";
import { updateModule } from "@/app/dashboard/courses/actions";
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

export type ModuleValues = {
  id: string;
  title: string;
  state: string;
  requireSequentialProgress: boolean;
  requirementCount: string;
  prerequisiteModuleIds: string[];
  unlockAt: string | null; // ISO or null
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  // datetime-local wants YYYY-MM-DDTHH:mm in local time.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function ModuleSettingsDialog({
  courseId,
  module,
  otherModules,
}: {
  courseId: string;
  module: ModuleValues;
  otherModules: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const prereqs = new Set(module.prerequisiteModuleIds);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Module settings"
          className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
        >
          <Settings2 className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Module settings</DialogTitle>
        </DialogHeader>
        <form
          action={updateModule}
          onSubmit={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="id" value={module.id} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-title">Title</Label>
            <Input
              id="m-title"
              name="title"
              defaultValue={module.title}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-reqcount">Completion</Label>
            <Select
              id="m-reqcount"
              name="requirementCount"
              defaultValue={module.requirementCount}
            >
              <option value="ALL">Complete all requirements</option>
              <option value="ONE">Complete one requirement</option>
            </Select>
          </div>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              name="requireSequentialProgress"
              defaultChecked={module.requireSequentialProgress}
              className="size-4 rounded border-outline-variant accent-accent"
            />
            <span className="text-sm text-on-surface">
              Require items to be completed in order
            </span>
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-unlock">Unlock date (optional)</Label>
            <Input
              id="m-unlock"
              name="unlockAt"
              type="datetime-local"
              defaultValue={toLocalInput(module.unlockAt)}
            />
          </div>

          {otherModules.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-on-surface">
                Prerequisite modules
              </legend>
              <p className="text-xs text-on-surface-variant">
                This module stays locked until the selected modules are
                complete.
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded border border-outline-variant/60 p-2">
                {otherModules.map((m) => (
                  <label key={m.id} className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      name="prerequisiteModuleIds"
                      value={m.id}
                      defaultChecked={prereqs.has(m.id)}
                      className="size-4 rounded border-outline-variant accent-accent"
                    />
                    <span className="text-sm text-on-surface">{m.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save module</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
