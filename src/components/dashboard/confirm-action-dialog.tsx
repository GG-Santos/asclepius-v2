"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ConfirmButton({
  label,
  destructive,
}: {
  label: string;
  destructive: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={destructive ? "destructive" : "default"}
      disabled={pending}
    >
      {pending ? "Working…" : label}
    </Button>
  );
}

/**
 * Confirmation step for destructive or consequential actions (Canvas
 * convention: nothing destructive fires from a bare icon click). Wraps a
 * server-action form so the confirmed submit is the real mutation.
 */
export function ConfirmActionDialog({
  trigger,
  title,
  description,
  consequences,
  confirmLabel,
  destructive = true,
  action,
  fields,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  /** Optional bullet list spelling out exactly what happens. */
  consequences?: string[];
  confirmLabel: string;
  destructive?: boolean;
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {consequences && consequences.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
            {consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <form action={action} className="flex justify-end gap-2">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <ConfirmButton label={confirmLabel} destructive={destructive} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
