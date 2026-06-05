import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth, type Role } from "@/lib/auth";
import { verificationState } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: Role;
  graduateLcn?: string | null;
};

// Cached per-request so multiple calls in one render don't re-hit the DB.
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as { role?: string; graduateLcn?: string | null };
  const role = (u.role ?? "writer") as Role;
  return {
    ...session,
    user: {
      ...session.user,
      role,
      graduateLcn: u.graduateLcn ?? null,
    } as SessionUser,
  };
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "admin") redirect("/dashboard?denied=graduates");
  return session;
}

/**
 * Gate for the graduate portal. Requires a graduate session, loads their
 * Graduate record, and HARD-LOCKS access when the license is expired/archived
 * (redirect to /portal/expired) unless `allowExpired` is set.
 */
export async function requireGraduate(opts?: { allowExpired?: boolean }) {
  const session = await getSession();
  if (!session) redirect("/portal/login");
  if (session.user.role !== "graduate") redirect("/portal/login");

  const lcn = session.user.graduateLcn;
  const graduate = lcn
    ? await prisma.graduate.findUnique({
        where: { lcn },
        include: { photo: true },
      })
    : null;

  if (!graduate) redirect("/portal/login");

  const state = verificationState(graduate);
  if (!opts?.allowExpired && state !== "verified") {
    redirect("/portal/expired");
  }

  return { session, graduate, state };
}
