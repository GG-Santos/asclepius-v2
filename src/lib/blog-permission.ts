// Blog authoring permission: admins always; graduates only when an admin has
// granted canBlog. The flag is re-read from the DB on every check so a
// revocation takes effect immediately (no session/cookie caching of canBlog).
import "server-only";
import { prisma } from "@/lib/prisma";
import type { getSession } from "@/lib/session";

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function canAuthorPosts(session: Session): Promise<boolean> {
  if (session.user.role === "admin") return true;
  if (session.user.role !== "graduate") return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { canBlog: true },
  });
  return Boolean(user?.canBlog);
}
