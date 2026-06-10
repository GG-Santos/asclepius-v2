"use client";

import {
  KeyRound,
  Lock,
  LockOpen,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
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
  createStaff,
  deleteStaff,
  setStaffLocked,
  setStaffPassword,
  updateStaff,
} from "@/app/dashboard/staff/actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  locked: boolean;
  createdAt: string;
  isSelf: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  professor: "Professor",
  writer: "Writer",
};

function CreateStaffForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createStaff, {});
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Staff account created.");
      formRef.current?.reset();
      router.refresh();
      onDone();
    }
    if (state.error) toast.error(state.error);
  }, [state, router, onDone]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add staff account</CardTitle>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              aria-invalid={fe.email ? true : undefined}
            />
            {fe.email && <p className="text-xs text-error">{fe.email}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              name="password"
              type="text"
              placeholder="≥ 8 characters"
              aria-invalid={fe.password ? true : undefined}
            />
            {fe.password && <p className="text-xs text-error">{fe.password}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="writer"
              className="h-11 rounded border border-outline-variant bg-card px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="writer">Writer (blog only)</option>
              <option value="professor">Professor (own batches)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              <UserPlus aria-hidden />{" "}
              {pending ? "Creating…" : "Create account"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EditStaffDialog({ row }: { row: StaffRow }) {
  const [state, action, pending] = useActionState(updateStaff, {});
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Account updated.");
      setOpen(false);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Edit"
          className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
        >
          <Pencil className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={row.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`name-${row.id}`}>Name</Label>
            <Input id={`name-${row.id}`} name="name" defaultValue={row.name} />
            {fe.name && <p className="text-xs text-error">{fe.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`email-${row.id}`}>Email</Label>
            <Input
              id={`email-${row.id}`}
              name="email"
              type="email"
              defaultValue={row.email}
            />
            {fe.email && <p className="text-xs text-error">{fe.email}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`role-${row.id}`}>Role</Label>
            <select
              id={`role-${row.id}`}
              name="role"
              defaultValue={row.role}
              disabled={row.isSelf}
              className="h-11 rounded border border-outline-variant bg-card px-3 text-sm disabled:opacity-60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="writer">Writer</option>
              <option value="professor">Professor</option>
              <option value="admin">Admin</option>
            </select>
            {row.isSelf && (
              <p className="text-xs text-on-surface-variant">
                You can't change your own role.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordButton({ row }: { row: StaffRow }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (password.length < 8) {
      toast.error("Password must be ≥ 8 characters.");
      return;
    }
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("password", password);
    startTransition(async () => {
      const res = await setStaffPassword(fd);
      if (res.ok) {
        toast.success(`Password reset for ${row.email}.`);
        setPassword("");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Could not reset password.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Reset password"
          className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
        >
          <KeyRound className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-on-surface-variant">
          Set a new password for{" "}
          <span className="font-medium text-on-surface">{row.email}</span>.
        </p>
        <Input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (≥ 8 characters)"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Set password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StaffManager({ rows }: { rows: StaffRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function toggleLock(row: StaffRow) {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("locked", String(!row.locked));
    startTransition(async () => {
      const res = await setStaffLocked(fd);
      if (res.ok) {
        toast.success(
          row.locked ? `Unlocked ${row.email}.` : `Locked ${row.email}.`,
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not update the account.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        meta={
          <p>
            Admin, professor, and writer accounts. {rows.length} user
            {rows.length === 1 ? "" : "s"}.
          </p>
        }
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X aria-hidden /> : <UserPlus aria-hidden />}
            {showForm ? "Close" : "Add staff"}
          </Button>
        }
      />

      {showForm && <CreateStaffForm onDone={() => setShowForm(false)} />}

      <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container text-on-surface dark:border-white/[0.06]">
              <th className="px-3 py-2 text-left font-semibold">Name</th>
              <th className="px-3 py-2 text-left font-semibold">Email</th>
              <th className="px-3 py-2 text-left font-semibold">Role</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr
                key={u.id}
                className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low"
              >
                <td className="px-3 py-2 font-medium text-on-surface">
                  {u.name}
                  {u.isSelf && (
                    <Badge variant="neutral" className="ml-2">
                      you
                    </Badge>
                  )}
                  {u.locked && (
                    <Badge variant="neutral" className="ml-2 text-secondary">
                      locked
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-on-surface-variant">{u.email}</td>
                <td className="px-3 py-2 text-on-surface-variant">
                  {ROLE_LABEL[u.role] ?? u.role}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <EditStaffDialog row={u} />
                    <ResetPasswordButton row={u} />
                    {!u.isSelf && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleLock(u)}
                        title={u.locked ? "Unlock account" : "Lock account"}
                        className={`rounded p-1.5 disabled:opacity-40 ${
                          u.locked
                            ? "text-warning hover:bg-warning/10"
                            : "text-on-surface-variant hover:bg-surface-container hover:text-warning"
                        }`}
                      >
                        {u.locked ? (
                          <LockOpen className="size-4" />
                        ) : (
                          <Lock className="size-4" />
                        )}
                      </button>
                    )}
                    {!u.isSelf && (
                      <ConfirmButton
                        buttonTitle="Delete"
                        className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
                        title={`Delete ${u.email}?`}
                        description="This permanently deletes the account. Their blog posts are reassigned to you. This cannot be undone."
                        successMessage={`Deleted ${u.email}.`}
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", u.id);
                          const res = await deleteStaff(fd);
                          if (res?.ok) router.refresh();
                          return res;
                        }}
                      >
                        <Trash2 className="size-4" />
                      </ConfirmButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
