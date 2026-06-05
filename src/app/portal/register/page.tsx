import type { Metadata } from "next";
import { PortalAuthShell } from "@/components/portal/auth-shell";
import { RegisterForm } from "@/components/portal/register-form";

export const metadata: Metadata = { title: "Graduate portal — Register" };

export default function PortalRegisterPage() {
  return (
    <PortalAuthShell
      title="Create your account"
      subtitle="Verify with your License Number and last name."
    >
      <RegisterForm />
    </PortalAuthShell>
  );
}
