// Diagnostic: what do recently-touched graduates look like? (Finding the
// renewals done earlier today through some path other than the Renew button.)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const since = new Date(Date.now() - 2 * 86_400_000);
  const rows = await prisma.graduate.findMany({
    where: { updatedAt: { gte: since } },
    select: {
      lcn: true,
      status: true,
      registrationRaw: true,
      registeredAt: true,
      expirationRaw: true,
      expiresAt: true,
      recertifiedAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  for (const g of rows) {
    console.log(
      [
        g.lcn,
        g.status,
        `reg=${g.registrationRaw ?? "-"} (${g.registeredAt?.toISOString().slice(0, 10) ?? "-"})`,
        `exp=${g.expirationRaw ?? "-"} (${g.expiresAt?.toISOString().slice(0, 10) ?? "-"})`,
        `recert=${g.recertifiedAt?.toISOString() ?? "NULL"}`,
        `updated=${g.updatedAt.toISOString()}`,
      ].join(" | "),
    );
  }
  console.log(`${rows.length} graduate(s) updated in the last 48h.`);
}

main().finally(() => prisma.$disconnect());
