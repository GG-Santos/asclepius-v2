import { NextResponse } from "next/server";
import { canAuthorPosts } from "@/lib/blog-permission";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Public 3D models, for the blog editor's insert picker. Editors only:
// admins, or graduates the admin has granted blog authoring (canBlog).
export async function GET() {
  const session = await getSession();
  if (!session || !(await canAuthorPosts(session))) {
    return NextResponse.json([], { status: 403 });
  }
  const models = await prisma.model3D.findMany({
    where: { public: true },
    orderBy: { createdAt: "desc" },
    select: { slug: true, name: true, posterUrl: true },
  });
  return NextResponse.json(models);
}
