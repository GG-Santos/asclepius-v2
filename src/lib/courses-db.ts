import { PrismaClient } from "@/generated/courses";

// Client for the separate LMS database (COURSES_URL). Mirrors src/lib/prisma.ts:
// a single instance reused across dev hot-reloads to avoid exhausting the pool.
const globalForCourses = globalThis as unknown as {
  coursesPrisma?: PrismaClient;
};

export const coursesPrisma =
  globalForCourses.coursesPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForCourses.coursesPrisma = coursesPrisma;
}
