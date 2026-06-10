import { PageHeader } from "@/components/dashboard/page-header";
import {
  type TestimonialRow,
  TestimonialsManager,
} from "@/components/dashboard/testimonials-manager";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function TestimonialsPage() {
  await requireAdmin();
  const items = await prisma.testimonial.findMany({
    orderBy: [
      { pinned: "desc" },
      { approved: "desc" },
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });

  const rows: TestimonialRow[] = items.map((t) => ({
    id: t.id,
    name: t.name,
    batchCode: t.batchCode,
    quote: t.quote,
    rating: t.rating,
    approved: t.approved,
    pinned: t.pinned,
    fromPortal: Boolean(t.submittedByLcn),
  }));

  const pendingCount = rows.filter((r) => !r.approved).length;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title="Testimonials"
        meta={
          <p>
            Graduates submit these from their portal. Approve to publish, and
            pin the best ones to show first on the homepage.
            {pendingCount > 0 && (
              <span className="ml-1 font-medium text-warning">
                {pendingCount} awaiting review.
              </span>
            )}
          </p>
        }
      />
      <TestimonialsManager rows={rows} />
    </div>
  );
}
