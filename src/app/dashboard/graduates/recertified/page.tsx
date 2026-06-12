import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  type RecertifiedItem,
  RecertifiedZip,
} from "@/components/dashboard/recertified-zip";
import { imageToDataUri } from "@/lib/data-uri";
import { displayName } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { certificateQrDataUrl, verifyQrDataUrl } from "@/lib/qr";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Recertified graduates" };

const PRESETS = [
  { value: "1", label: "1d" },
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;

function rangeStart(range: string): Date {
  const days = Number(range);
  return new Date(
    Date.now() - (Number.isFinite(days) && days > 0 ? days : 30) * 86_400_000,
  );
}

export default async function RecertifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { range, from, to } = await searchParams;

  // Custom from/to beats the presets; default preset is 30 days.
  const custom = Boolean(from || to);
  const activeRange = PRESETS.some((p) => p.value === range)
    ? (range as string)
    : "30";
  const since = custom
    ? from
      ? new Date(`${from}T00:00:00`)
      : new Date(0)
    : rangeStart(activeRange);
  const until = custom && to ? new Date(`${to}T23:59:59.999`) : null;

  const graduates = await prisma.graduate.findMany({
    where: {
      recertifiedAt: { gte: since, ...(until ? { lte: until } : {}) },
    },
    include: { photo: true },
    orderBy: { recertifiedAt: "desc" },
    take: 200,
  });

  // Everything the client exporter needs, pre-resolved server-side: the photo
  // as a data URI (no canvas taint) and both QR payloads.
  const items: RecertifiedItem[] = await Promise.all(
    graduates.map(async (g) => ({
      id: g.id,
      lcn: g.lcn,
      name: displayName(g),
      issued: g.issuedRaw,
      expiration: g.expirationRaw,
      recertifiedAt: g.recertifiedAt?.toLocaleDateString() ?? "",
      photoDataUrl: g.photo?.url ? await imageToDataUri(g.photo.url) : null,
      qrDataUrl: await verifyQrDataUrl(g.lcn),
      certQrDataUrl: await certificateQrDataUrl(g.lcn),
    })),
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <Link
          href="/dashboard/graduates"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to graduates
        </Link>
      </div>
      <PageHeader
        title="Recertified graduates"
        meta={
          <p>
            {items.length} renewal{items.length === 1 ? "" : "s"} in the
            selected window. Download a ZIP of every renewed ID (front and back)
            for printing.
          </p>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-outline-variant/60 bg-card p-0.5">
          {PRESETS.map((p) => {
            const active = !custom && activeRange === p.value;
            return (
              <Link
                key={p.value}
                href={`/dashboard/graduates/recertified?range=${p.value}`}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-md bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"
                    : "rounded-md px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface"
                }
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        {/* Custom range — plain GET form, server-filtered. */}
        <form
          action="/dashboard/graduates/recertified"
          className="flex items-center gap-2 text-xs"
        >
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-8 rounded border border-outline-variant/60 bg-card px-2 text-on-surface"
          />
          <span className="text-on-surface-variant">to</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-8 rounded border border-outline-variant/60 bg-card px-2 text-on-surface"
          />
          <button
            type="submit"
            className="rounded border border-outline-variant/60 bg-card px-2.5 py-1.5 font-semibold text-on-surface hover:border-accent hover:text-accent"
          >
            Apply
          </button>
        </form>
      </div>

      <RecertifiedZip items={items} />
    </div>
  );
}
