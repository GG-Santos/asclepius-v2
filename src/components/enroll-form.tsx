"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { submitInquiry } from "@/app/enroll/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROGRAMS = [
  { value: "EMT", label: "Basic EMT (license-eligible)" },
  { value: "EMR", label: "Emergency Medical Responder" },
  { value: "BLS", label: "Basic Life Support" },
  { value: "SPECIALIZED", label: "Specialized course" },
  { value: "GENERAL", label: "Not sure yet" },
];

export function EnrollForm() {
  const [state, action, pending] = useActionState(submitInquiry, {});
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-card p-8 text-center shadow-clinical">
        <h2 className="text-xl font-bold text-on-surface">Request received</h2>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
          Thanks — WSL EMS admissions will reach out with the next intake
          schedule and requirements. Please check your email for a reply.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          aria-invalid={fe.name ? true : undefined}
        />
        {fe.name && <p className="text-xs text-error">{fe.name}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={fe.email ? true : undefined}
          />
          {fe.email && <p className="text-xs text-error">{fe.email}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="program">Program of interest</Label>
        <select
          id="program"
          name="program"
          defaultValue="EMT"
          className="h-12 rounded border border-outline-variant bg-card px-3 text-sm text-on-surface focus:border-accent focus:outline-none"
        >
          {PROGRAMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Message (optional)</Label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Tell us about your goals or any questions."
          className="rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-accent focus:outline-none"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Request information"}
      </Button>
      <p className="text-center text-xs text-on-surface-variant">
        We use your details only to respond to this inquiry. No spam.
      </p>
    </form>
  );
}
