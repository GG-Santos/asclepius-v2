export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "course"
  );
}

export type CourseWithCurriculum = {
  modules: { lessons: { id: string }[] }[];
};

/** All lesson ids of a course, in module → lesson order. */
export function lessonIdsOf(course: CourseWithCurriculum): string[] {
  return course.modules.flatMap((m) => m.lessons.map((l) => l.id));
}

/** Completion ratio 0..1 given total lessons and completed count. */
export function progressRatio(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(1, completed / total);
}

/** CE certificate number: CE + YYMM + 6-char id tail. */
export function certificateNumber(enrollmentId: string, date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `CE-${yy}${mm}-${enrollmentId.slice(-6).toUpperCase()}`;
}
