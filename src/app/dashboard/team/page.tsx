import { TeamManager, type TeamRow } from "@/components/dashboard/team-manager";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function TeamPage() {
  await requireAdmin();
  const items = await prisma.teamMember.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  const rows: TeamRow[] = items.map((t) => ({
    id: t.id,
    name: t.name,
    role: t.role,
    credentials: t.credentials,
    photoUrl: t.photoUrl,
    published: t.published,
  }));

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Team</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Instructors and staff shown on the homepage. Only published members
          are public.
        </p>
      </div>
      <TeamManager rows={rows} />
    </div>
  );
}
