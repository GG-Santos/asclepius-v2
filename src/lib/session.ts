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
  // Admin-locked accounts are denied access (and their sessions are purged on
  // lock, so this is a belt-and-braces check for any still-valid cookie).
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { locked: true },
  });
  if (account?.locked) return null;
  const u = session.user as { role?: string; graduateLcn?: string | null };
  // Role-less accounts default to graduate (least-privileged path: portal
  // gates bounce them without an LCN). Legacy "writer" is preserved as-is so
  // the dashboard layout can deny it pending admin reassignment.
  const role = (u.role ?? "graduate") as Role;
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

/**
 * Dashboard gate: admin and professor only. Graduates are redirected to
 * their portal; legacy roles ("writer", anything unknown) are denied until
 * an admin reassigns the account — signalled to the layout as `pending`.
 */
export async function requireStaff(): Promise<
  | { session: Awaited<ReturnType<typeof requireUser>>; pending: false }
  | { session: Awaited<ReturnType<typeof requireUser>>; pending: true }
> {
  const session = await requireUser();
  const role = session.user.role as string;
  if (role === "graduate") redirect("/portal");
  if (role !== "admin" && role !== "professor") {
    return { session, pending: true };
  }
  return { session, pending: false };
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "admin") redirect("/dashboard?denied=graduates");
  return session;
}

/**
 * Throwing admin gate for server actions: actions called from a non-admin
 * client must REJECT (error result, nothing persisted), not redirect.
 */
export async function requireAdminAction() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Admin only.");
  }
  return session;
}

/**
 * True when `userId` is the assigned professor of the batch with `batchCode`
 * AND that batch is not yet graduated. Used to scope professor write access to
 * their own active cohorts (graduated batches become view-only).
 */
export async function canProfessorEditBatch(
  userId: string,
  batchCode: string | null,
): Promise<boolean> {
  if (!batchCode) return false;
  const batch = await prisma.batch.findUnique({
    where: { code: batchCode },
    select: { professorId: true, graduated: true },
  });
  return Boolean(batch && batch.professorId === userId && !batch.graduated);
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
