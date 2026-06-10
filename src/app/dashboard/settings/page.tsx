import type { Metadata } from "next";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { PasswordForm } from "@/components/account/password-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const session = await requireUser();
  const { name, email, role, image } = session.user;

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader
        title="Account settings"
        meta={
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-on-surface">{name}</span>
            <span>· {email} ·</span>
            <Badge variant="neutral" className="capitalize">
              {role}
            </Badge>
          </p>
        }
      />
      <AvatarUpload name={name} currentUrl={image ?? null} />
      <PasswordForm />
    </div>
  );
}
