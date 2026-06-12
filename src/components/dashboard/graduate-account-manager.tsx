"use client";

import { PenLine, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  createGraduateAccount,
  setGraduateCanBlog,
} from "@/app/dashboard/graduates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GraduateAccountManager({
  lcn,
  existingEmail,
  accountId = null,
  canBlog = false,
}: {
  lcn: string;
  existingEmail: string | null;
  accountId?: string | null;
  canBlog?: boolean;
}) {
  const [state, action, pending] = useActionState(createGraduateAccount, {});
  const router = useRouter();
  const [togglePending, startToggle] = useTransition();

  useEffect(() => {
    if (state.ok) {
      toast.success("Portal account created.");
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  function toggleBlog() {
    if (!accountId) return;
    const fd = new FormData();
    fd.set("userId", accountId);
    fd.set("canBlog", String(!canBlog));
    startToggle(async () => {
      const result = await setGraduateCanBlog(fd);
      if (result.ok) {
        toast.success(
          !canBlog
            ? "Blog access granted — they can draft posts from the portal."
            : "Blog access revoked — existing posts remain, no new edits.",
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not update blog access.");
      }
    });
  }

  if (existingEmail) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-on-surface-variant">
          Portal account active:{" "}
          <span className="font-medium text-on-surface">{existingEmail}</span>
        </p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface-low p-3 dark:border-white/[0.08]">
          <span className="flex items-center gap-2 text-sm text-on-surface">
            <PenLine className="size-4 text-on-surface-variant" aria-hidden />
            Blog authoring
            <span className="text-xs text-on-surface-variant">
              {canBlog ? "— allowed (drafts only)" : "— not allowed"}
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            variant={canBlog ? "outline" : "default"}
            disabled={togglePending || !accountId}
            onClick={toggleBlog}
          >
            {canBlog ? "Revoke" : "Allow"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <input type="hidden" name="lcn" value={lcn} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-email">Email</Label>
        <Input
          id="ga-email"
          name="email"
          type="email"
          placeholder="graduate@email.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-pass">Temporary password</Label>
        <Input
          id="ga-pass"
          name="password"
          type="text"
          placeholder="≥ 8 characters"
        />
      </div>
      <Button type="submit" disabled={pending}>
        <UserPlus aria-hidden /> {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
