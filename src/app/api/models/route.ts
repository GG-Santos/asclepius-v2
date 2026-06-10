import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Public 3D models, for the blog editor's insert picker. Editors only.
export async function GET() {
  const session = await getSession();
  const role = session?.user.role;
  if (role !== "admin" && role !== "writer") {
    return NextResponse.json([], { status: 403 });
  }
  const models = await prisma.model3D.findMany({
    where: { public: true },
    orderBy: { createdAt: "desc" },
    select: { slug: true, name: true, posterUrl: true },
  });
  return NextResponse.json(models);
}
