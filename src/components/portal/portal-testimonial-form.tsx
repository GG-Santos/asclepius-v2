"use client";

import { Quote, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { submitTestimonial } from "@/app/portal/(app)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Existing = {
  quote: string;
  rating: number;
  approved: boolean;
  pinned: boolean;
} | null;

export function PortalTestimonialForm({ existing }: { existing: Existing }) {
  const [state, action, pending] = useActionState(submitTestimonial, {});
  const [rating, setRating] = useState(5);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success("Thanks! Your testimonial was sent for review.");
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  // Already submitted (pending or published) — show status instead of the form.
  if (existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your testimonial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-1 text-warning">
            {Array.from({ length: existing.rating }).map((_, i) => (
              <Star
                key={`star-${i + 1}`}
                className="size-4 fill-current"
                aria-hidden
              />
            ))}
          </div>
          <p className="text-sm text-on-surface">“{existing.quote}”</p>
          <span
            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${
              existing.approved
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }`}
          >
            {existing.approved ? "Published on homepage" : "Awaiting review"}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Quote className="size-4 text-accent" /> Share your experience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-on-surface-variant">
          Tell future students about your training. Approved testimonials appear
          on the homepage.
        </p>
        <form action={action} className="space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className="p-0.5"
              >
                <Star
                  className={`size-6 ${n <= rating ? "fill-warning text-warning" : "text-on-surface-variant/40"}`}
                />
              </button>
            ))}
            <input type="hidden" name="rating" value={rating} />
          </div>
          <textarea
            name="quote"
            rows={4}
            maxLength={600}
            required
            placeholder="The instructors really prepared me for the field…"
            className="w-full rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-accent focus:outline-none"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Submit for review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
