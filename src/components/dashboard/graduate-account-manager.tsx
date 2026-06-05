"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createGraduateAccount } from "@/app/dashboard/graduates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GraduateAccountManager({
  lcn,
  existingEmail,
}: {
  lcn: string;
  existingEmail: string | null;
}) {
  const [state, action, pending] = useActionState(createGraduateAccount, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success("Portal account created.");
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  if (existingEmail) {
    return (
      <p className="text-sm text-on-surface-variant">
        Portal account active:{" "}
        <span className="font-medium text-on-surface">{existingEmail}</span>
      </p>
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
