import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  InquiryDetail,
  type InquiryDetailData,
} from "@/components/dashboard/inquiry-detail";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const q = await prisma.inquiry.findUnique({ where: { id } });
  if (!q) notFound();

  const inquiry: InquiryDetailData = {
    id: q.id,
    name: q.name,
    email: q.email,
    phone: q.phone,
    program: q.program,
    message: q.message,
    status: q.status,
    notes: q.notes,
    repliedAt: q.repliedAt ? q.repliedAt.toISOString() : null,
    createdAt: q.createdAt.toISOString(),
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <Link
          href="/dashboard/inquiries"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> All inquiries
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-on-surface">
          {inquiry.name}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Inquiry details and management.
        </p>
      </div>
      <InquiryDetail inquiry={inquiry} />
    </div>
  );
}
