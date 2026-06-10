"use client";

import { useState, useTransition } from "react";
import { promoteStudent } from "@/app/dashboard/students/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PromoteStudentDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: { id: string; name: string } | null;
  onSuccess: (lcn: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!student) return;
    setError(null);
    const fd = new FormData();
    fd.set("id", student.id);
    startTransition(async () => {
      const res = await promoteStudent(fd);
      if (res.ok && res.promotedLcn) {
        onOpenChange(false);
        onSuccess(res.promotedLcn);
      } else {
        setError(res.error ?? "Could not graduate this student.");
      }
    });
  }

  function handleOpenChange(v: boolean) {
    if (pending) return;
    setError(null);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Graduate {student?.name ?? "this student"}?</DialogTitle>
          <DialogDescription>
            A licensed Graduate record will be created and the student will be
            archived. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            className="bg-success text-on-success hover:bg-success/90"
            onClick={handleConfirm}
          >
            {pending ? "Graduating…" : "Graduate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
