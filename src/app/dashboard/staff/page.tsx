import {
  StaffManager,
  type StaffRow,
} from "@/components/dashboard/staff-manager";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function StaffPage() {
  const session = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  const rows: StaffRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    isSelf: u.id === session.user.id,
  }));

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Staff</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Create and manage admin and writer accounts. {rows.length} user
          {rows.length === 1 ? "" : "s"}.
        </p>
      </div>
      <StaffManager rows={rows} />
    </div>
  );
}
