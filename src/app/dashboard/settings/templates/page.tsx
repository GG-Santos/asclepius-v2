import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { TemplateEditor } from "@/components/dashboard/template-editor";
import { getActiveTemplate } from "@/lib/org-settings";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Artifact templates" };

export default async function TemplatesSettingsPage() {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/dashboard/settings");
  const active = await getActiveTemplate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Artifact templates"
        meta={
          <p>
            Customize the certificate and license ID artwork — replace logos and
            artwork layers, override text, and set text colors. Saved changes
            apply live to every artifact, including past graduates.
          </p>
        }
      />
      <TemplateEditor initialConfig={active.config} />
    </div>
  );
}
