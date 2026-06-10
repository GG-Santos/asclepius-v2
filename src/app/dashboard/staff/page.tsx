import {
  StaffManager,
  type StaffRow,
} from "@/components/dashboard/staff-manager";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function StaffPage() {
  const session = await requireAdmin();
  const users = await prisma.user.findMany({
    where: { role: { in: ["admin", "writer", "professor"] } },
    orderBy: { createdAt: "asc" },
  });

  const rows: StaffRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    locked: u.locked,
    createdAt: u.createdAt.toISOString(),
    isSelf: u.id === session.user.id,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <StaffManager rows={rows} />
    </div>
  );
}
