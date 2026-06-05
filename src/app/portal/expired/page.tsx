import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { PortalAuthShell } from "@/components/portal/auth-shell";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: "License expired" };

export default function PortalExpiredPage() {
  return (
    <PortalAuthShell title="License expired">
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="size-10 text-secondary" aria-hidden />
        <p className="text-sm text-on-surface-variant">
          Your EMT license is no longer active, so portal and course access is
          locked. Renew your license to regain access — your public credential
          continues to show its true status.
        </p>
        <SignOutButton />
      </div>
    </PortalAuthShell>
  );
}
