import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();
  const batches = await prisma.batch.findMany({
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
