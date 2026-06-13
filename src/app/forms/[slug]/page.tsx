import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { submitPublicForm } from "@/app/forms/[slug]/actions";
import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type PublicFormField,
  parsePublicFormFields,
} from "@/lib/form-builder";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const form = await prisma.publicForm.findUnique({
    where: { slug },
    select: { title: true, description: true, status: true },
  });
  if (!form || form.status !== "PUBLISHED") return { title: "Form" };
  return {
    title: form.title,
    description: form.description ?? undefined,
  };
}

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const form = await prisma.publicForm.findUnique({ where: { slug } });
  if (!form || form.status !== "PUBLISHED") notFound();

  const fields = parsePublicFormFields(form.fields);
  const action = submitPublicForm.bind(null, form.slug);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader verifyHref="/#verify" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[860px] px-4 py-12 md:px-8 md:py-16">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              WSL EMS forms
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
              {form.title}
            </h1>
            {form.description && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-on-surface-variant">
                {form.description}
              </p>
            )}
          </div>

          {query.submitted ? (
            <Card className="border-success/40 bg-success/5">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-success">
                  Submission received
                </h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Thank you. WSL EMS will review this information from the admin
                  queue.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 md:p-8">
                {query.error === "required" && (
                  <p className="mb-5 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning">
                    Complete all required fields and accept the consent text.
                  </p>
                )}
                <form action={action} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="respondentName">Name</Label>
                      <Input
                        id="respondentName"
                        name="respondentName"
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="respondentEmail">Email</Label>
                      <Input
                        id="respondentEmail"
                        name="respondentEmail"
                        type="email"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="graduateLcn">LCN, if applicable</Label>
                      <Input
                        id="graduateLcn"
                        name="graduateLcn"
                        placeholder="A15-251201"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {fields.map((field) => (
                      <PublicField key={field.id} field={field} />
                    ))}
                  </div>

                  {form.consentText && (
                    <label className="flex items-start gap-3 rounded-lg border border-outline-variant/60 bg-surface-low p-3 text-sm text-on-surface-variant">
                      <input
                        type="checkbox"
                        name="consentAccepted"
                        className="mt-1 size-4 accent-accent"
                        required
                      />
                      <span>{form.consentText}</span>
                    </label>
                  )}

                  <Button type="submit">Submit form</Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function PublicField({ field }: { field: PublicFormField }) {
  const name = `field:${field.id}`;
  const id = `field-${field.id}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required && <span className="text-warning"> *</span>}
      </Label>
      {field.type === "textarea" ? (
        <Textarea id={id} name={name} rows={4} required={field.required} />
      ) : field.type === "select" ? (
        <Select id={id} name={name} required={field.required} defaultValue="">
          <option value="" disabled>
            Select one
          </option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          id={id}
          name={name}
          type={field.type === "phone" ? "tel" : field.type}
          required={field.required}
        />
      )}
    </div>
  );
}
