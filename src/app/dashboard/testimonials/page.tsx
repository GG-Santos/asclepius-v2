import {
  type TestimonialRow,
  TestimonialsManager,
} from "@/components/dashboard/testimonials-manager";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function TestimonialsPage() {
  await requireAdmin();
  const items = await prisma.testimonial.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  const rows: TestimonialRow[] = items.map((t) => ({
    id: t.id,
    name: t.name,
    batchCode: t.batchCode,
    quote: t.quote,
    rating: t.rating,
    approved: t.approved,
  }));

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Testimonials</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Graduate quotes shown on the homepage. Only approved testimonials are
          public.
        </p>
      </div>
      <TestimonialsManager rows={rows} />
    </div>
  );
}
