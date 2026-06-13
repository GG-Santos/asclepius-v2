"use client";

import { GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type GraduationPreview,
  markBatchGraduated,
  previewBatchGraduation,
} from "@/app/dashboard/batches/actions";
import { fireGraduationConfetti } from "@/components/dashboard/graduation-confetti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/50 bg-surface-low p-2">
      <p className={`tabular text-xl font-bold ${cls}`}>{n}</p>
      <p className="text-[11px] text-on-surface-variant">{label}</p>
    </div>
  );
}

export function BatchGraduationDialog({
  batchId,
  batchName,
}: {
  batchId: string;
  batchName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<GraduationPreview | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, startLoad] = useTransition();
  const [pending, startCommit] = useTransition();

  function openDialog() {
    setPreview(null);
    setOpen(true);
    startLoad(async () => {
      setPreview(await previewBatchGraduation(batchId));
    });
  }

  function confirm() {
    const fd = new FormData();
    fd.set("id", batchId);
    fd.set("graduatedAt", date);
    startCommit(async () => {
      const res = await markBatchGraduated(fd);
      if (res.ok) {
        toast.success("Batch graduated.");
        fireGraduationConfetti();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not graduate the batch.");
      }
    });
  }

  const blocked = (preview?.incomplete.length ?? 0) > 0;

  return (
    <>
      <Button
        onClick={openDialog}
        className="bg-success text-on-success hover:bg-success/90"
      >
        <GraduationCap aria-hidden /> Mark batch graduated
      </Button>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Graduate {batchName}?</DialogTitle>
            <DialogDescription>
              Students at 70% or above become licensed graduates; those below
              70% are withdrawn. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {loading || !preview ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              Checking the cohort…
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat
                  n={preview.graduate.length}
                  label="Will graduate"
                  cls="text-success"
                />
                <Stat
                  n={preview.withdraw.length}
                  label="Withdrawn"
                  cls="text-secondary"
                />
                <Stat
                  n={preview.incomplete.length}
                  label="No scores"
                  cls="text-warning"
                />
              </div>

              {blocked && (
                <p className="rounded bg-warning/10 px-3 py-2 text-xs text-warning">
                  {preview.incomplete.length} student(s) have no scores yet.
                  Enter their results or withdraw them first — graduation is
                  blocked until then.
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="graduatedAt">Graduation date</Label>
                <Input
                  id="graduatedAt"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={pending || blocked}
                  onClick={confirm}
                  className="bg-success text-on-success hover:bg-success/90"
                >
                  {pending
                    ? "Graduating…"
                    : `Graduate ${preview.graduate.length} student(s)`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
