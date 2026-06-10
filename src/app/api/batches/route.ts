import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  const role = session?.user.role;
  if (!session || (role !== "admin" && role !== "professor")) {
    return NextResponse.json([], { status: 403 });
  }
  // Professors only pick from their own non-graduated batches.
  const where =
    role === "professor"
      ? { professorId: session.user.id, graduated: false }
      : {};
  const batches = await prisma.batch.findMany({
    where,
    select: {
      id: true,
      code: true,
      batchNumber: true,
      label: true,
    },
    orderBy: [{ batchNumber: "asc" }, { code: "asc" }],
  });
  return NextResponse.json(batches);
}
