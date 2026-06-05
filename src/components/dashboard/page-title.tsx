"use client";

import { usePathname } from "next/navigation";

const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard/students", title: "Students" },
  { prefix: "/dashboard/graduates", title: "Graduates" },
  { prefix: "/dashboard/batches", title: "Batches" },
  { prefix: "/dashboard/blog", title: "Blog" },
  { prefix: "/dashboard/staff", title: "Staff" },
  { prefix: "/dashboard", title: "Overview" },
];

export function DashboardPageTitle() {
  const pathname = usePathname();
  const match = TITLES.find((t) => pathname.startsWith(t.prefix));
  return (
    <h1 className="font-semibold text-on-surface">
      {match?.title ?? "Dashboard"}
    </h1>
  );
}
