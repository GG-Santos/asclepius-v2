import type { Metadata } from "next";
import { PortalAuthShell } from "@/components/portal/auth-shell";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export const metadata: Metadata = { title: "Graduate portal — Sign in" };

export default function PortalLoginPage() {
  return (
    <PortalAuthShell
      title="Graduate sign in"
      subtitle="Active EMT graduates only."
    >
      <PortalLoginForm />
    </PortalAuthShell>
  );
}
