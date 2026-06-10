"use client";

import { CheckCircle2, Circle, Contact, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  createTeamMember,
  deleteTeamMember,
  setTeamPublished,
} from "@/app/dashboard/team/actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

function CreateForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createTeamMember, {});
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Team member added — publish to show on the homepage.");
      formRef.current?.reset();
      router.refresh();
      onDone();
    }
    if (state.error) toast.error(state.error);
  }, [state, router, onDone]);

  return (
    <Card>
      <CardContent className="pt-6">
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
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        meta={
          <p>
            Instructors and staff shown on the homepage. Only published members
            are public.
          </p>
        }
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X aria-hidden /> : <Plus aria-hidden />}
            {showForm ? "Close" : "New member"}
          </Button>
        }
      />

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Contact aria-hidden />}
          title="No team members yet"
          description="Add one and publish it to show on the homepage."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus aria-hidden /> New member
            </Button>
          }
        />
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
              <ConfirmButton
                buttonTitle="Delete"
                className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
                title={`Delete ${r.name}?`}
                description="This permanently removes the team member. This cannot be undone."
                successMessage="Deleted."
                onConfirm={async () => {
                  const fd = new FormData();
                  fd.set("id", r.id);
                  await deleteTeamMember(fd);
                  router.refresh();
                }}
              >
                <Trash2 className="size-4" />
              </ConfirmButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
