"use client";

import { Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LicenseCard } from "@/components/verify/license-card";
import { LicenseCardBack } from "@/components/verify/license-card-back";

export type RecertifiedItem = {
  id: string;
  lcn: string;
  name: string;
  issued: string | null;
  expiration: string | null;
  recertifiedAt: string;
  /** Server-inlined data URI — keeps html-to-image's canvas untainted. */
  photoDataUrl: string | null;
  qrDataUrl: string;
  certQrDataUrl: string;
};

type CardReport = { lcn: string; side: "front" | "back"; error: string };

// ISO ID-1 width @600dpi — same constant the single-card export uses.
const ID_EXPORT_WIDTH = 2022;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * R14: batch ZIP of every listed graduate's ID front + back. Cards render
 * one graduate at a time in an offscreen stage, rasterize via html-to-image,
 * and stream into a ZIP. The export NEVER completes silently incomplete —
 * per-card failures are listed and counted.
 */
export function RecertifiedZip({ items }: { items: RecertifiedItem[] }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [failures, setFailures] = useState<CardReport[]>([]);
  const [current, setCurrent] = useState<RecertifiedItem | null>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  async function exportZip() {
    if (items.length === 0) return;
    setBusy(true);
    setFailures([]);
    const report: CardReport[] = [];
    try {
      const [{ toPng }, { default: JSZip }] = await Promise.all([
        import("html-to-image"),
        import("jszip"),
      ]);
      const zip = new JSZip();
      let done = 0;

      for (const item of items) {
        setCurrent(item);
        // Give React a beat to mount + the browser to decode the images.
        await sleep(250);

        for (const side of ["front", "back"] as const) {
          const node = (side === "front" ? frontRef : backRef).current;
          try {
            if (!node || node.offsetWidth === 0) {
              throw new Error("card did not render");
            }
            const dataUrl = await toPng(node, {
              pixelRatio: ID_EXPORT_WIDTH / node.offsetWidth,
              backgroundColor: "#ffffff",
              style: { borderRadius: "0", border: "none", boxShadow: "none" },
            });
            zip.file(
              `${item.lcn}-id-${side}.png`,
              dataUrl.split(",")[1] ?? "",
              { base64: true },
            );
          } catch (e) {
            report.push({
              lcn: item.lcn,
              side,
              error: e instanceof Error ? e.message : "render failed",
            });
          }
        }
        done += 1;
        setProgress(`${done}/${items.length}`);
      }
      setCurrent(null);

      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `recertified-ids-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);

      setFailures(report);
      if (report.length === 0) {
        toast.success(
          `ZIP ready — ${items.length * 2} card image(s), all rendered.`,
        );
      } else {
        toast.error(
          `ZIP ready, but ${report.length} card(s) FAILED to render — see the list below. Do not distribute without checking it.`,
        );
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not build the ZIP archive.",
      );
    } finally {
      setBusy(false);
      setProgress("");
      setCurrent(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={busy || items.length === 0}
          onClick={exportZip}
        >
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          {busy
            ? `Rendering ${progress}…`
            : `Download ZIP (${items.length * 2} card images)`}
        </Button>
        {items.length === 0 && (
          <span className="text-sm text-on-surface-variant">
            No renewals in this window yet — renew a license and it appears
            here.
          </span>
        )}
      </div>

      {failures.length > 0 && (
        <Card className="border-error/40">
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="font-semibold text-error">
              {failures.length} card(s) missing from the archive:
            </p>
            <ul className="list-inside list-disc text-on-surface-variant">
              {failures.map((f) => (
                <li key={`${f.lcn}-${f.side}`}>
                  {f.lcn} ({f.side}) — {f.error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Listing */}
      <ul className="divide-y divide-outline-variant/40 rounded-lg border border-outline-variant/60 bg-card dark:divide-white/[0.06] dark:border-white/[0.08]">
        {items.map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium uppercase text-on-surface">
                {g.name}
              </span>
              <span className="font-mono text-xs text-on-surface-variant">
                {g.lcn}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-on-surface-variant">
                renewed {g.recertifiedAt}
              </span>
              <Badge variant="verified">until {g.expiration ?? "—"}</Badge>
            </span>
          </li>
        ))}
      </ul>

      {/* Offscreen render stage — one graduate at a time. Width MUST equal
          the card's max-w-xl (576px): any wider and the centered card leaves
          whitespace bands in the exported PNG. */}
      {current && (
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-[-2000px] w-[576px] bg-white"
        >
          <div ref={frontRef}>
            <LicenseCard
              name={current.name}
              lcn={current.lcn}
              issued={current.issued}
              expiration={current.expiration}
              photoUrl={current.photoDataUrl}
              signature
              frameless
            />
          </div>
          <div ref={backRef}>
            <LicenseCardBack
              qrDataUrl={current.certQrDataUrl ?? current.qrDataUrl}
              signatures={{ one: true, two: true }}
              frameless
            />
          </div>
        </div>
      )}
    </div>
  );
}
