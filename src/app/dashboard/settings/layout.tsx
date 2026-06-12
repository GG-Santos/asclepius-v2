import { SettingsTabs } from "@/components/dashboard/settings-tabs";
import { requireUser } from "@/lib/session";

// Org settings shell. Account is available to all staff; Templates and
// Expiry are admin-only — non-admins see no tab links (the pages themselves
// also redirect, and every mutation re-checks the role server-side).
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <SettingsTabs isAdmin={session.user.role === "admin"} />
      {children}
    </div>
  );
}
