"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import {
  type StudentRow,
  StudentsTable,
} from "@/components/dashboard/students-table";
import { Input } from "@/components/ui/input";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "IN_TRAINING", label: "In Training" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "WITHDRAWN", label: "Withdrawn" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

export function StudentListClient({
  rows,
  initialQuery,
  inTrainingCount,
}: {
  rows: StudentRow[];
  initialQuery?: string;
  inTrainingCount: number;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? "");

  const q = searchQuery.toLowerCase().trim();

  const filtered = rows.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.enrollmentNo.toLowerCase().includes(q)
    );
  });

  const selectedLabel = STATUS_OPTIONS.find(
    (o) => o.value === statusFilter,
  )?.label.toLowerCase();

  const emptyMessage =
    statusFilter === "ALL" && !q
      ? 'No students yet. Add the first one with "New student".'
      : `No ${selectedLabel} students match your search.`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">
        <span className="font-medium text-on-surface">{inTrainingCount}</span>{" "}
        in training
        {inTrainingCount > 0 && " · Graduate a student to issue a license"}.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-on-surface-variant" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or enrollment number"
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="h-11 rounded border border-outline-variant bg-card px-3 text-sm text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <StudentsTable rows={filtered} emptyMessage={emptyMessage} />
    </div>
  );
}
