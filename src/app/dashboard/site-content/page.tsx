import { RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getHomePageContent } from "@/lib/home-content";
import { requireAdmin } from "@/lib/session";
import { resetHomePageContent, saveHomePageContent } from "./actions";

export const dynamic = "force-dynamic";

function Field({
  name,
  label,
  value,
  multiline = false,
}: {
  name: string;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {multiline ? (
        <Textarea id={name} name={name} defaultValue={value} rows={4} />
      ) : (
        <Input id={name} name={name} defaultValue={value} />
      )}
    </div>
  );
}

export default async function SiteContentPage() {
  await requireAdmin();
  const content = await getHomePageContent();

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <PageHeader
        title="Homepage CMS"
        meta={<p>Public homepage copy, CTAs, and curated section images.</p>}
      />

      <form action={saveHomePageContent} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hero</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field
              name="heroEyebrow"
              label="Eyebrow"
              value={content.heroEyebrow}
            />
            <Field
              name="heroImageUrl"
              label="Hero image URL"
              value={content.heroImageUrl}
            />
            <Field name="heroTitle" label="Title" value={content.heroTitle} />
            <Field
              name="heroAccent"
              label="Highlighted title"
              value={content.heroAccent}
            />
            <div className="md:col-span-2">
              <Field
                name="heroBody"
                label="Supporting copy"
                value={content.heroBody}
                multiline
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field
              name="aboutEyebrow"
              label="Eyebrow"
              value={content.aboutEyebrow}
            />
            <Field
              name="aboutImageUrl"
              label="About image URL"
              value={content.aboutImageUrl}
            />
            <div className="md:col-span-2">
              <Field
                name="aboutTitle"
                label="Title"
                value={content.aboutTitle}
              />
            </div>
            <Field
              name="aboutBodyOne"
              label="Body paragraph 1"
              value={content.aboutBodyOne}
              multiline
            />
            <Field
              name="aboutBodyTwo"
              label="Body paragraph 2"
              value={content.aboutBodyTwo}
              multiline
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programs and Final CTA</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field
              name="programsEyebrow"
              label="Programs eyebrow"
              value={content.programsEyebrow}
            />
            <Field
              name="programImageUrl"
              label="Programs image URL"
              value={content.programImageUrl}
            />
            <div className="md:col-span-2">
              <Field
                name="programsTitle"
                label="Programs title"
                value={content.programsTitle}
              />
            </div>
            <div className="md:col-span-2">
              <Field
                name="programsBody"
                label="Programs copy"
                value={content.programsBody}
                multiline
              />
            </div>
            <Field
              name="finalCtaTitle"
              label="Final CTA title"
              value={content.finalCtaTitle}
            />
            <Field
              name="finalCtaBody"
              label="Final CTA copy"
              value={content.finalCtaBody}
              multiline
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Program</CardTitle>
            <p className="text-sm text-on-surface-variant">
              Announcement displayed in the Programs section of the homepage.
              Manage enrollment details here — not in individual batches.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                name="upcomingShow"
                value="true"
                defaultChecked={content.upcomingShow === "true"}
                className="size-4 accent-[var(--color-accent)]"
              />
              <span className="text-sm text-on-surface">Show on homepage</span>
            </label>
            <Field
              name="upcomingProgram"
              label="Program name"
              value={content.upcomingProgram}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upcomingStatus">Enrollment status</Label>
              <select
                id="upcomingStatus"
                name="upcomingStatus"
                defaultValue={content.upcomingStatus}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Not listed</option>
                <option value="ANNOUNCED">Announced</option>
                <option value="OPEN">Open</option>
                <option value="WAITLIST">Waitlist</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upcomingStartAt">Start date</Label>
              <Input
                id="upcomingStartAt"
                name="upcomingStartAt"
                type="date"
                defaultValue={content.upcomingStartAt}
              />
            </div>
            <Field
              name="upcomingCapacity"
              label="Capacity (seats)"
              value={content.upcomingCapacity}
            />
            <Field
              name="upcomingCtaUrl"
              label="Application URL"
              value={content.upcomingCtaUrl}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            formAction={resetHomePageContent}
            type="submit"
            variant="outline"
          >
            <RotateCcw aria-hidden /> Reset defaults
          </Button>
          <Button type="submit">
            <Save aria-hidden /> Save homepage
          </Button>
        </div>
      </form>
    </div>
  );
}
