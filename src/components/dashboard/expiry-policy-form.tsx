"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import {
  type ExpiryPolicyActionState,
  saveExpiryPolicy,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPIRY_POLICY_BOUNDS, type ExpiryPolicy } from "@/lib/expiry-policy";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-error">{message}</p>;
}

export function ExpiryPolicyForm({ policy }: { policy: ExpiryPolicy }) {
  const [state, formAction, pending] = useActionState<
    ExpiryPolicyActionState,
    FormData
  >(async (prev, fd) => {
    const result = await saveExpiryPolicy(prev, fd);
    if (result.ok) toast.success("Expiry policy saved.");
    if (result.error) toast.error(result.error);
    return result;
  }, {});
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="licenseValidityYears">
                License validity (years)
              </Label>
              <Input
                id="licenseValidityYears"
                name="licenseValidityYears"
                type="number"
                min={EXPIRY_POLICY_BOUNDS.licenseValidityYears.min}
                max={EXPIRY_POLICY_BOUNDS.licenseValidityYears.max}
                step={1}
                defaultValue={policy.licenseValidityYears}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                Default expiry offered at promotion and added on renewal.
              </p>
              <FieldError message={fe.licenseValidityYears} />
            </div>
            <div>
              <Label htmlFor="archiveGraceYears">
                Auto-archive grace (years)
              </Label>
              <Input
                id="archiveGraceYears"
                name="archiveGraceYears"
                type="number"
                min={EXPIRY_POLICY_BOUNDS.archiveGraceYears.min}
                max={EXPIRY_POLICY_BOUNDS.archiveGraceYears.max}
                step={1}
                defaultValue={policy.archiveGraceYears}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                How long past expiry before a license is auto-archived.
              </p>
              <FieldError message={fe.archiveGraceYears} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save policy"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
