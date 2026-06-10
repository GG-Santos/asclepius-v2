"use client";

import { KeyRound } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  type AccountActionState,
  changeMyPassword,
} from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Self-service password change — shared by staff and graduate settings. */
export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountActionState, FormData>(
    changeMyPassword,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Password changed. Other sessions were signed out.");
      formRef.current?.reset();
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-accent" aria-hidden />
          Change password
        </CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">
          Changing your password signs you out everywhere else.
        </p>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="max-w-sm space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={fe.currentPassword ? true : undefined}
            />
            {fe.currentPassword && (
              <p className="text-xs text-error">{fe.currentPassword}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="≥ 8 characters"
              aria-invalid={fe.newPassword ? true : undefined}
            />
            {fe.newPassword && (
              <p className="text-xs text-error">{fe.newPassword}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={fe.confirmPassword ? true : undefined}
            />
            {fe.confirmPassword && (
              <p className="text-xs text-error">{fe.confirmPassword}</p>
            )}
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Changing…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
