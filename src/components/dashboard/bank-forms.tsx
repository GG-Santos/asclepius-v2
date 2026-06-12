"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  type CourseActionState,
  createBank,
  updateBank,
} from "@/app/dashboard/courses/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Inline creator for a new question bank (banks index page). */
export function NewBankForm() {
  const [state, formAction, pending] = useActionState<
    CourseActionState,
    FormData
  >(createBank, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-low/40 p-5 dark:bg-white/[0.02]"
    >
      <div className="min-w-[220px] flex-1">
        <Label
          htmlFor="bank-title"
          className="mb-1.5 block text-label-caps text-on-surface-variant"
        >
          New question bank
        </Label>
        <Input
          id="bank-title"
          name="title"
          placeholder="e.g. Airway Management pool"
          required
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus aria-hidden /> {pending ? "Creating…" : "Create bank"}
      </Button>
    </form>
  );
}

/** Title/description editor on the bank detail page. */
export function BankSettingsForm({
  bank,
}: {
  bank: { id: string; title: string; description: string | null };
}) {
  const [state, formAction, pending] = useActionState<
    CourseActionState,
    FormData
  >(updateBank, {});
  const handled = useRef(false);

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success("Bank saved.");
      setTimeout(() => {
        handled.current = false;
      }, 100);
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={bank.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-title">Title</Label>
            <Input
              id="b-title"
              name="title"
              defaultValue={bank.title}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-desc">Description (optional)</Label>
            <Textarea
              id="b-desc"
              name="description"
              defaultValue={bank.description ?? ""}
              rows={2}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save bank"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
