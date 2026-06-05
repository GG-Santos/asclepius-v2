"use client";

import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import {
  createTestimonial,
  deleteTestimonial,
  setTestimonialApproved,
} from "@/app/dashboard/testimonials/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TestimonialRow = {
  id: string;
  name: string;
  batchCode: string | null;
  quote: string;
  rating: number;
  approved: boolean;
};

function CreateForm() {
  const [state, action, pending] = useActionState(createTestimonial, {});
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Testimonial added — approve it to show on the homepage.");
      formRef.current?.reset();
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add testimonial</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Graduate name</Label>
            <Input
              id="name"
              name="name"
              aria-invalid={fe.name ? true : undefined}
            />
            {fe.name && <p className="text-xs text-error">{fe.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="batchCode">Batch (optional)</Label>
            <Input id="batchCode" name="batchCode" placeholder="BATCH-09" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rating">Rating</Label>
            <select
              id="rating"
              name="rating"
              defaultValue="5"
              className="h-11 rounded border border-outline-variant bg-card px-3 text-sm focus:border-accent focus:outline-none"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="quote">Quote</Label>
            <textarea
              id="quote"
              name="quote"
              rows={3}
              className="rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-accent focus:outline-none"
              aria-invalid={fe.quote ? true : undefined}
            />
            {fe.quote && <p className="text-xs text-error">{fe.quote}</p>}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              <Plus aria-hidden /> {pending ? "Adding…" : "Add testimonial"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function TestimonialsManager({ rows }: { rows: TestimonialRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(row: TestimonialRow) {
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

  function remove(row: TestimonialRow) {
    if (!confirm(`Delete the testimonial from ${row.name}?`)) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      await deleteTestimonial(fd);
      toast.success("Deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <CreateForm />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-outline-variant bg-card p-8 text-center text-sm text-on-surface-variant">
          No testimonials yet. Approved testimonials appear on the homepage.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 rounded-lg border border-outline-variant bg-card p-4"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">
                  {r.name}{" "}
                  <span className="font-normal text-on-surface-variant">
                    · {r.batchCode ?? "—"} · {r.rating}★
                  </span>
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {r.quote}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(r)}
                title={
                  r.approved
                    ? "Live — click to hide"
                    : "Pending — click to approve"
                }
                className={`rounded p-1.5 ${r.approved ? "text-success hover:bg-success/10" : "text-on-surface-variant hover:bg-surface-container"}`}
              >
                {r.approved ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Circle className="size-5" />
                )}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(r)}
                title="Delete"
                className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
