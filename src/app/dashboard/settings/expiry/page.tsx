import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExpiryPolicyForm } from "@/components/dashboard/expiry-policy-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { getExpiryPolicy } from "@/lib/org-settings";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Expiry policy" };

export default async function ExpiryPolicyPage() {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/dashboard/settings");
  const policy = await getExpiryPolicy();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiry policy"
        meta={
          <p>
            License validity and auto-archive durations. Changes apply to future
            promotions and renewals only — existing graduate records keep their
            dates.
          </p>
        }
      />
      <ExpiryPolicyForm policy={policy} />
    </div>
  );
}
