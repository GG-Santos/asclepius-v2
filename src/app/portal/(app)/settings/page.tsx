import type { Metadata } from "next";
import { PasswordForm } from "@/components/account/password-form";
import { PortalPhotoUpdate } from "@/components/portal/portal-photo-update";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayName } from "@/lib/graduate";
import { requireGraduate } from "@/lib/session";

export const metadata: Metadata = { title: "Account settings" };

// Settings stay reachable on an expired license — renewing your password or
// portrait is account hygiene, not a credential privilege.
export default async function PortalSettingsPage() {
  const { graduate } = await requireGraduate({ allowExpired: true });

  return (
    <div className="mx-auto max-w-[640px] space-y-6">
      <div>
        <h1 className="text-headline-lg text-on-surface">Account settings</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {displayName(graduate)} ·{" "}
          <span className="tabular">{graduate.lcn}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portrait</CardTitle>
          <p className="mt-1 text-sm text-on-surface-variant">
            Shown on your credential card and verification page.
          </p>
        </CardHeader>
        <CardContent>
          <PortalPhotoUpdate currentUrl={graduate.photo?.url ?? null} />
        </CardContent>
      </Card>

      <PasswordForm />
    </div>
  );
}
