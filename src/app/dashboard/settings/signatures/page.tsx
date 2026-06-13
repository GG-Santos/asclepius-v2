import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  deleteSignatureAsset,
  saveSignatureAsset,
} from "@/app/dashboard/settings/signatures/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { SignaturePad } from "@/components/dashboard/signature-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOrgSettings } from "@/lib/org-settings";
import { getSession } from "@/lib/session";
import { parseSignatureAssets } from "@/lib/signature-assets";

export const metadata: Metadata = { title: "Signature assets" };

export default async function SignatureSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/dashboard/settings");
  const params = await searchParams;
  const settings = await getOrgSettings();
  const assets = parseSignatureAssets(settings?.signatureAssets);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Signature assets"
        meta={
          <p>
            Capture approved signatures for certificate and ID templates. These
            are private admin assets, not public graduate uploads.
          </p>
        }
      />

      {params.error === "missing-signature" && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm text-warning">
            Draw a signature before saving.
          </CardContent>
        </Card>
      )}
      {params.saved && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="p-4 text-sm text-success">
            Signature asset saved.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capture a signature</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSignatureAsset} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="label">Signature label</Label>
                <Input
                  id="label"
                  name="label"
                  placeholder="Medical Director"
                  defaultValue="Authorized signature"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Signer role</Label>
                <Input id="role" name="role" placeholder="Program Director" />
              </div>
            </div>
            <SignaturePad />
            <Button type="submit">Save signature asset</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved signatures</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline-variant px-4 py-8 text-center text-sm text-on-surface-variant">
              No signature assets yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-lg border border-outline-variant/60 bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-on-surface">
                        {asset.label}
                      </p>
                      {asset.role && (
                        <p className="text-xs text-on-surface-variant">
                          {asset.role}
                        </p>
                      )}
                    </div>
                    <form action={deleteSignatureAsset}>
                      <input type="hidden" name="id" value={asset.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Remove
                      </Button>
                    </form>
                  </div>
                  <div className="mt-4 rounded-md bg-white p-3">
                    {/* biome-ignore lint/performance/noImgElement: sanitized data URL preview */}
                    <img
                      src={asset.svgDataUrl}
                      alt={`${asset.label} signature`}
                      className="h-24 w-full object-contain"
                    />
                  </div>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Added {new Date(asset.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
