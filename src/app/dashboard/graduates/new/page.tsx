import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createGraduate } from "@/app/dashboard/graduates/actions";
import { GraduateForm } from "@/components/dashboard/graduate-form";
import { getExpiryPolicy } from "@/lib/org-settings";
import { requireAdmin } from "@/lib/session";

export default async function NewGraduatePage() {
  await requireAdmin();
  const { licenseValidityYears } = await getExpiryPolicy();

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/graduates"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Back to records
      </Link>
      <GraduateForm
        action={createGraduate}
        submitLabel="Create Record"
        validityYears={licenseValidityYears}
      />
    </div>
  );
}
