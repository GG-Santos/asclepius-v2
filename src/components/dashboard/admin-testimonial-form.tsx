"use client";

import { Quote, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createAdminTestimonial } from "@/app/dashboard/testimonials/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Admin testimonial entry. Standalone (Testimonials page) — free name/batch.
 * On a graduate's behalf (their record page, `graduate` prop) — identity is
 * pinned to the record and the entry publishes immediately as a PLACEHOLDER,
 * replaced when the graduate submits their own from the portal.
 */
export function AdminTestimonialForm({
  graduate = null,
}: {
  graduate?: { lcn: string; name: string; batchCode: string | null } | null;
}) {
  const [state, action, pending] = useActionState(createAdminTestimonial, {});
  const [rating, setRating] = useState(5);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Testimonial added and published.");
      formRef.current?.reset();
      setRating(5);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Quote className="size-4 text-accent" />
          {graduate ? "Testimonial on their behalf" : "Add a testimonial"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          {graduate ? (
            <>
              <input type="hidden" name="name" value={graduate.name} />
              <input
                type="hidden"
                name="batchCode"
                value={graduate.batchCode ?? ""}
              />
              <input type="hidden" name="lcn" value={graduate.lcn} />
              <p className="text-xs text-on-surface-variant">
                Publishes immediately under{" "}
                <span className="font-medium text-on-surface">
                  {graduate.name}
                </span>{" "}
                as a placeholder — replaced (and re-reviewed) the moment they
                submit their own from the portal.
              </p>
              {fe.lcn && <p className="text-xs text-error">{fe.lcn}</p>}
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-name">Name</Label>
                <Input
                  id="t-name"
                  name="name"
                  placeholder="Juan Dela Cruz"
                  aria-invalid={fe.name ? true : undefined}
                />
                {fe.name && <p className="text-xs text-error">{fe.name}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-batch">Batch (optional)</Label>
                <Input id="t-batch" name="batchCode" placeholder="BATCH-09" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                aria-pressed={n === rating}
                className="p-0.5"
              >
                <Star
                  className={`size-6 ${n <= rating ? "fill-warning text-warning" : "text-on-surface-variant/40"}`}
                />
              </button>
            ))}
            <input type="hidden" name="rating" value={rating} />
            {fe.rating && <p className="text-xs text-error">{fe.rating}</p>}
          </div>

          <textarea
            name="quote"
            rows={3}
            maxLength={600}
            required
            placeholder="What they said about the training…"
            aria-invalid={fe.quote ? true : undefined}
            className="w-full rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-accent focus:outline-none"
          />
          {fe.quote && <p className="text-xs text-error">{fe.quote}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add testimonial"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
