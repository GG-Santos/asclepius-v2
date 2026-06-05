"use client";

import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import {
  createTeamMember,
  deleteTeamMember,
  setTeamPublished,
} from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TeamRow = {
  id: string;
  name: string;
  role: string;
  credentials: string | null;
  photoUrl: string | null;
  published: boolean;
};

function CreateForm() {
  const [state, action, pending] = useActionState(createTeamMember, {});
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Team member added — publish to show on the homepage.");
      formRef.current?.reset();
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add team member</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              aria-invalid={fe.name ? true : undefined}
            />
            {fe.name && <p className="text-xs text-error">{fe.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              name="role"
              placeholder="Lead Instructor"
              aria-invalid={fe.role ? true : undefined}
            />
            {fe.role && <p className="text-xs text-error">{fe.role}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="credentials">Credentials (optional)</Label>
            <Input
              id="credentials"
              name="credentials"
              placeholder="EMT-P, ASHI Instructor"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="photoUrl">Photo URL (optional)</Label>
            <Input id="photoUrl" name="photoUrl" placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              <Plus aria-hidden /> {pending ? "Adding…" : "Add team member"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function TeamManager({ rows }: { rows: TeamRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(row: TeamRow) {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("published", String(!row.published));
    startTransition(async () => {
      await setTeamPublished(fd);
      toast.success(
        row.published ? "Hidden from homepage." : "Now live on homepage.",
      );
      router.refresh();
    });
  }

  function remove(row: TeamRow) {
    if (!confirm(`Delete ${row.name}?`)) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      await deleteTeamMember(fd);
      toast.success("Deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <CreateForm />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-outline-variant bg-card p-8 text-center text-sm text-on-surface-variant">
          No team members yet. Published members appear on the homepage.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-outline-variant bg-card p-4"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">
                  {r.name}{" "}
                  <span className="font-normal text-accent">· {r.role}</span>
                </p>
                {r.credentials && (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {r.credentials}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(r)}
                title={
                  r.published
                    ? "Live — click to hide"
                    : "Hidden — click to publish"
                }
                className={`rounded p-1.5 ${r.published ? "text-success hover:bg-success/10" : "text-on-surface-variant hover:bg-surface-container"}`}
              >
                {r.published ? (
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
