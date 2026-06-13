import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  resetQrSettings,
  saveQrSettings,
} from "@/app/dashboard/settings/qr/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { verifyQrDataUrl } from "@/lib/qr";
import { contrastRatio, getQrConfig } from "@/lib/qr-config";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "QR settings" };

export default async function QrSettingsPage() {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/dashboard/settings");

  const config = await getQrConfig();
  const qrPreview = await verifyQrDataUrl("A15-251201");
  const contrast = contrastRatio(config.foreground, config.background);
  const contrastOk = contrast >= 4.5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR settings"
        meta={
          <p>
            Customize verification QR defaults. Certificate and ID templates use
            high error correction for logo overlays.
          </p>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Verification QR defaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveQrSettings} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Size" htmlFor="size">
                  <Input
                    id="size"
                    name="size"
                    type="number"
                    min={128}
                    max={1024}
                    step={8}
                    defaultValue={config.size}
                  />
                </Field>
                <Field label="Error correction" htmlFor="errorCorrectionLevel">
                  <Select
                    id="errorCorrectionLevel"
                    name="errorCorrectionLevel"
                    defaultValue={config.errorCorrectionLevel}
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                  </Select>
                </Field>
                <Field label="Foreground" htmlFor="foreground-swatch">
                  <div className="grid grid-cols-[3.25rem_1fr] gap-2">
                    <Input
                      id="foreground-swatch"
                      aria-label="Foreground color picker"
                      name="foreground"
                      type="color"
                      defaultValue={config.foreground}
                      className="p-1"
                    />
                    <Input
                      aria-label="Foreground color value"
                      defaultValue={config.foreground}
                      disabled
                    />
                  </div>
                </Field>
                <Field label="Background" htmlFor="background">
                  <div className="grid grid-cols-[3.25rem_1fr] gap-2">
                    <Input
                      id="background"
                      aria-label="Background color picker"
                      name="background"
                      type="color"
                      defaultValue={config.background}
                      className="p-1"
                    />
                    <Input
                      aria-label="Background color value"
                      defaultValue={config.background}
                      disabled
                    />
                  </div>
                </Field>
              </div>

              <Field label="Logo URL for template overlay" htmlFor="logoUrl">
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  type="url"
                  placeholder="/assets/img/logo.png"
                  defaultValue={config.logoUrl}
                />
              </Field>

              <div className="rounded-lg border border-outline-variant/60 bg-surface-low p-3 text-sm text-on-surface-variant">
                Contrast ratio:{" "}
                <span
                  className={
                    contrastOk
                      ? "font-semibold text-success"
                      : "font-semibold text-warning"
                  }
                >
                  {contrast.toFixed(1)}:1
                </span>
                . Keep the QR dark-on-light for reliable scans.
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save QR settings</Button>
                <Button
                  type="submit"
                  variant="outline"
                  formAction={resetQrSettings}
                >
                  Reset defaults
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* biome-ignore lint/performance/noImgElement: generated data URL preview */}
            <img
              src={qrPreview}
              alt="Verification QR preview"
              className="mx-auto aspect-square w-full max-w-52 rounded-lg border border-outline-variant bg-white p-3"
            />
            {config.logoUrl && (
              <div className="rounded-lg border border-outline-variant/60 bg-surface-low p-3 text-xs text-on-surface-variant">
                Logo overlay saved for templates:{" "}
                <span className="break-all font-medium text-on-surface">
                  {config.logoUrl}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
