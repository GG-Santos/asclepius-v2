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
        <InquiriesTable rows={rows} />
      )}
    </div>
  );
}
