// Wave-3 gate (R6/R7/R8): every blog/post mutation and editor support route
// must begin with its declared authorization gate. Static assertions over
// the source — the gates this checks for are the security boundary.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const failures: string[] = [];

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/** Assert the named exported function's body contains every marker. */
function assertFnContains(
  rel: string,
  fnName: string,
  markers: string[],
): void {
  const text = read(rel);
  const start = text.indexOf(`function ${fnName}`);
  if (start === -1) {
    failures.push(`${rel}: function ${fnName} not found`);
    return;
  }
  const next = text.indexOf("\nexport", start + 1);
  const body = text.slice(start, next === -1 ? undefined : next);
  for (const marker of markers) {
    if (!body.includes(marker)) {
      failures.push(`${rel}: ${fnName} missing "${marker}"`);
    }
  }
}

// Dashboard blog actions: admin-only, no requireUser left.
const dash = "src/app/dashboard/blog/actions.ts";
assertFnContains(dash, "createPost", ["requireAdminAction"]);
assertFnContains(dash, "updatePost", ["requireAdminAction"]);
assertFnContains(dash, "deletePost", ["requireAdminAction"]);
if (read(dash).includes("requireUser")) {
  failures.push(`${dash}: requireUser still present (must be admin-gated)`);
}

// Portal post actions: graduate + canBlog (fresh read) + ownership + DRAFT.
const portal = "src/app/portal/(app)/posts/actions.ts";
assertFnContains(portal, "requireBlogGraduate", [
  'role !== "graduate"',
  "canAuthorPosts",
]);
assertFnContains(portal, "createMyPost", [
  "requireBlogGraduate",
  'status: "DRAFT"',
]);
assertFnContains(portal, "updateMyPost", [
  "requireBlogGraduate",
  "authorId !== session.user.id",
  'status: "DRAFT"',
]);

// Editor support routes: admin or canBlog graduate.
for (const route of [
  "src/app/api/models/route.ts",
  "src/app/api/upload/blog-image/route.ts",
]) {
  if (!read(route).includes("canAuthorPosts")) {
    failures.push(`${route}: missing canAuthorPosts gate`);
  }
}

// canBlog flag reads fresh from the DB inside the permission helper.
const perm = "src/lib/blog-permission.ts";
for (const marker of ["prisma.user.findUnique", "canBlog"]) {
  if (!read(perm).includes(marker)) {
    failures.push(`${perm}: missing "${marker}"`);
  }
}

// Admin toggle action is admin-gated and graduate-scoped.
assertFnContains(
  "src/app/dashboard/graduates/actions.ts",
  "setGraduateCanBlog",
  ["requireAdmin", 'role !== "graduate"'],
);

if (failures.length > 0) {
  console.error("BLOG AUTHZ CHECK FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "Blog authz check passed: dashboard actions admin-gated, portal actions graduate+canBlog+ownership with forced drafts, editor routes gated.",
);
