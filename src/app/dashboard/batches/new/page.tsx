import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BatchCreateForm } from "@/components/dashboard/batch-create-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function NewBatchPage() {
  await requireAdmin();

  const professors = await prisma.user.findMany({
    where: { role: { in: ["admin", "professor"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <PageHeader
        title="New batch"
        meta={
          <p>
            Set up the cohort profile, public description, logo, and assessment
            scheme before adding students.
          </p>
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/batches">
              <ArrowLeft aria-hidden /> Back to batches
            </Link>
          </Button>
        }
      />

      <BatchCreateForm professors={professors} />
    </div>
  );
}
