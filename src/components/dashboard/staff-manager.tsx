"use client";

import { KeyRound, Trash2, UserPlus } from "lucide-react";
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
  setStaffPassword,
  setStaffRole,
} from "@/app/dashboard/staff/actions";
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
  createdAt: string;
  isSelf: boolean;
};

function CreateStaffForm() {
  const [state, action, pending] = useActionState(createStaff, {});
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Staff account created.");
      formRef.current?.reset();
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

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

  function changeRole(row: StaffRow, role: string) {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("role", role);
    startTransition(async () => {
      await setStaffRole(fd);
      toast.success(`${row.name} is now ${role}.`);
      router.refresh();
    });
  }

  function remove(row: StaffRow) {
    if (!confirm(`Delete ${row.email}? This cannot be undone.`)) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      await deleteStaff(fd);
      toast.success(`Deleted ${row.email}.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <CreateStaffForm />

      <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-primary text-on-primary">
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
                </td>
                <td className="px-3 py-2 text-on-surface-variant">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    disabled={pending || u.isSelf}
                    onChange={(e) => changeRole(u, e.target.value)}
                    className="h-9 rounded border border-outline-variant bg-card px-2 text-sm disabled:opacity-60"
                  >
                    <option value="writer">writer</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <ResetPasswordButton row={u} />
                    <button
                      type="button"
                      disabled={pending || u.isSelf}
                      onClick={() => remove(u)}
                      title={u.isSelf ? "You can't delete yourself" : "Delete"}
                      className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
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
