"use client";

import { AlertTriangle, CircleCheck } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Controlled confirmation dialog — the one card every mutating action goes
 * through before it applies. `tone` picks the visual register: "danger" for
 * destructive actions (delete/lock), "primary" for apply/save actions.
 * Callers own the trigger, the pending state, and any toasts.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tone === "danger" ? (
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <AlertTriangle className="size-4" />
              </span>
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                <CircleCheck className="size-4" />
              </span>
            )}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-on-surface-variant">{description}</div>
        <div className="mt-2 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "secondary" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A destructive-action button that opens a confirmation dialog before running
 * `onConfirm`. Use for every delete/lock action so nothing is removed without an
 * explicit, readable warning. `onConfirm` may return `{ ok, error }` — an error
 * is surfaced as a toast and the dialog stays open.
 */
export function ConfirmButton({
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  tone = "danger",
  successMessage,
  buttonTitle,
  className,
  disabled,
  children,
}: {
  onConfirm: () => Promise<unknown>;
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  successMessage?: string;
  buttonTitle?: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await onConfirm();
      const error =
        res && typeof res === "object" && "error" in res
          ? (res as { error?: string }).error
          : undefined;
      if (error) {
        toast.error(error);
        return;
      }
      if (successMessage) toast.success(successMessage);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        title={buttonTitle}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={run}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        tone={tone}
        pending={pending}
      />
    </>
  );
}
