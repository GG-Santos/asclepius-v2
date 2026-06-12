"use client";

import { CheckCircle2, Circle, Pin, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  deleteTestimonial,
  setTestimonialApproved,
  setTestimonialPinned,
} from "@/app/dashboard/testimonials/actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";

export type TestimonialRow = {
  id: string;
  name: string;
  batchCode: string | null;
  quote: string;
  rating: number;
  approved: boolean;
  pinned: boolean;
  fromPortal: boolean;
  placeholder: boolean;
};

export function TestimonialsManager({ rows }: { rows: TestimonialRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleApproved(row: TestimonialRow) {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("approved", String(!row.approved));
    startTransition(async () => {
      await setTestimonialApproved(fd);
      toast.success(
        row.approved ? "Hidden from homepage." : "Now live on homepage.",
      );
      router.refresh();
    });
  }

  function togglePinned(row: TestimonialRow) {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("pinned", String(!row.pinned));
    startTransition(async () => {
      await setTestimonialPinned(fd);
      toast.success(row.pinned ? "Unpinned." : "Pinned to the top.");
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant bg-card p-8 text-center text-sm text-on-surface-variant">
        No testimonials yet. Graduates submit these from their portal; approved
        ones appear on the homepage.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className={`flex items-start gap-3 rounded-lg border bg-card p-4 ${
            r.pinned ? "border-accent/50" : "border-outline-variant"
          }`}
        >
          <div className="flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-on-surface">
              {r.name}
              <span className="font-normal text-on-surface-variant">
                · {r.batchCode ?? "—"}
              </span>
              <span className="inline-flex items-center gap-0.5 text-warning">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star
                    key={`s-${i + 1}`}
                    className="size-3.5 fill-current"
                    aria-hidden
                  />
                ))}
              </span>
              {r.pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  <Pin className="size-3" /> Pinned
                </span>
              )}
              {r.fromPortal && (
                <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
                  From graduate
                </span>
              )}
              {r.placeholder && (
                <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                  Placeholder — replaced when they submit their own
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">“{r.quote}”</p>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={() => togglePinned(r)}
            title={r.pinned ? "Unpin" : "Pin to top of homepage"}
            className={`rounded p-1.5 disabled:opacity-40 ${
              r.pinned
                ? "text-accent hover:bg-accent/10"
                : "text-on-surface-variant hover:bg-surface-container hover:text-accent"
            }`}
          >
            <Pin className={`size-5 ${r.pinned ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => toggleApproved(r)}
            title={
              r.approved ? "Live — click to hide" : "Pending — click to approve"
            }
            className={`rounded p-1.5 disabled:opacity-40 ${r.approved ? "text-success hover:bg-success/10" : "text-on-surface-variant hover:bg-surface-container"}`}
          >
            {r.approved ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <Circle className="size-5" />
            )}
          </button>
          <ConfirmButton
            buttonTitle="Delete"
            className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
            title={`Delete the testimonial from ${r.name}?`}
            description="This permanently removes the testimonial. This cannot be undone."
            successMessage="Deleted."
            onConfirm={async () => {
              const fd = new FormData();
              fd.set("id", r.id);
              await deleteTestimonial(fd);
              router.refresh();
            }}
          >
            <Trash2 className="size-4" />
          </ConfirmButton>
        </div>
      ))}
    </div>
  );
}
