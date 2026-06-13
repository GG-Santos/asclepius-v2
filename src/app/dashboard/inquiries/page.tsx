import { Inbox } from "lucide-react";
import {
  InquiriesTable,
  type InquiryRow,
} from "@/components/dashboard/inquiries-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  await requireAdmin();
  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows: InquiryRow[] = inquiries.map((q) => ({
    id: q.id,
    name: q.name,
    email: q.email,
    phone: q.phone,
    program: q.program,
    message: q.message,
    status: q.status,
    repliedAt: q.repliedAt ? q.repliedAt.toISOString() : null,
    createdAt: q.createdAt.toISOString(),
  }));

  const newCount = rows.filter((r) => r.status === "NEW").length;
  const lanes = [
    {
      status: "NEW",
      label: "New",
      tone: "text-accent bg-accent/10",
      rows: rows.filter((r) => r.status === "NEW"),
    },
    {
      status: "CONTACTED",
      label: "Contacted",
      tone: "text-warning bg-warning/10",
      rows: rows.filter((r) => r.status === "CONTACTED"),
    },
    {
      status: "CLOSED",
      label: "Closed",
      tone: "text-success bg-success/10",
      rows: rows.filter((r) => r.status === "CLOSED"),
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title="Inquiries"
        meta={
          <p>
            Training requests from the public enrollment form. {rows.length}{" "}
            total
            {newCount > 0 && (
              <span className="ml-1 font-medium text-accent">
                · {newCount} new
              </span>
            )}
            .
          </p>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Inbox aria-hidden />}
          title="No inquiries yet"
          description="Requests from the public enrollment form will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {lanes.map((lane) => (
              <section
                key={lane.status}
                className="rounded-xl border border-outline-variant bg-card p-4 shadow-clinical"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-on-surface">
                    {lane.label}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${lane.tone}`}
                  >
                    {lane.rows.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {lane.rows.slice(0, 3).map((r) => (
                    <a
                      key={r.id}
                      href={`mailto:${r.email}`}
                      className="block rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 transition-colors hover:border-accent"
                    >
                      <span className="block truncate text-sm font-medium text-on-surface">
                        {r.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                        {r.program ?? "General"} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {r.repliedAt ? " · replied" : ""}
                      </span>
                    </a>
                  ))}
                  {lane.rows.length === 0 && (
                    <p className="rounded-lg border border-dashed border-outline-variant px-3 py-6 text-center text-xs text-on-surface-variant">
                      No messages here.
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
          <InquiriesTable rows={rows} />
        </>
      )}
    </div>
  );
}
