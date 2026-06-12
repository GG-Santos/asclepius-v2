// License ID card V2 — BACK. The layered artwork (public/assets/svg/
// LicenseV2/back, canvas 3450 × 2210) with the live verification QR
// composited at the design's QR slot. The QR-logo layer sits on the QR
// center, so callers must supply an ECC-H QR (30% recovery) — same
// constraint as the certificate's embedded QR. Signatory names and lines are
// part of the artwork; the two ink-signature layers are admin-only.

import { TemplateTextLayer } from "@/components/verify/template-text";
import {
  DEFAULT_TEMPLATE,
  layerSrc,
  type ResolvedTemplate,
  suppressedOverride,
} from "@/lib/artifact-template/resolve";

const LAYER = "absolute inset-0 h-full w-full";
const ART = "/assets/svg/LicenseV2/back";

export type BackSignatureSlot = "one" | "two";
export type BackSignatureVisibility = Partial<
  Record<BackSignatureSlot, boolean>
>;

type LayerEntry =
  | { kind: "static"; file: string }
  | { kind: "signature"; file: string; slot: BackSignatureSlot }
  | { kind: "qr" };

/** Exact artwork stacking order (design layers 1–15). The QR entry replaces
 *  the design's sample placeholder at the same depth. */
const LAYERS: LayerEntry[] = [
  { kind: "static", file: "01-background.svg" },
  { kind: "static", file: "02-main-logo-watermark.svg" },
  { kind: "static", file: "03-training-center-text.svg" },
  { kind: "static", file: "04-certification-text.svg" },
  { kind: "static", file: "05-objectives.svg" },
  { kind: "qr" },
  { kind: "static", file: "07-qr-logo.svg" },
  { kind: "static", file: "08-position-1.svg" },
  { kind: "static", file: "09-signatory-1.svg" },
  { kind: "static", file: "10-line-1.svg" },
  { kind: "signature", file: "11-signature-1.svg", slot: "one" },
  { kind: "static", file: "12-position-2.svg" },
  { kind: "static", file: "13-signatory-2.svg" },
  { kind: "static", file: "14-line-2.svg" },
  { kind: "signature", file: "15-signature-2.svg", slot: "two" },
];

/* QR slot, measured from the design's sample placeholder (layer 6). */
const QR_RECT = { x: 2496, y: 652, w: 786, h: 786 };

export function LicenseCardBack({
  qrDataUrl,
  signatures,
  frameless = false,
  template = DEFAULT_TEMPLATE,
}: {
  /** Verification QR — must be ECC-H (the QR-logo layer covers its center). */
  qrDataUrl: string | null;
  /**
   * Admin-only, per-slot ink-signature visibility ({ one, two }). Omitted
   * (the public surface) means NO signature layer ever renders.
   */
  signatures?: BackSignatureVisibility;
  /** Print mode: no screen chrome (radius/border/shadow) — used for PNG export. */
  frameless?: boolean;
  /** Org artifact template; omitted = built-in artwork (zero-config parity). */
  template?: ResolvedTemplate;
}) {
  return (
    <div
      className={
        frameless
          ? "mx-auto w-full max-w-xl select-none bg-white"
          : "mx-auto w-full max-w-xl select-none overflow-hidden rounded-lg border border-outline-variant/60 bg-white shadow-[var(--shadow-clinical)]"
      }
    >
      <div className="relative w-full" style={{ aspectRatio: "3450 / 2210" }}>
        {LAYERS.map((layer, i) => {
          const key = `layer-${i}`;
          switch (layer.kind) {
            case "static": {
              const override = suppressedOverride(
                template,
                "license-back",
                layer.file,
              );
              if (override) {
                return <TemplateTextLayer key={key} override={override} />;
              }
              return (
                // biome-ignore lint/performance/noImgElement: fixed local SVG artwork layers, not content images
                <img
                  key={key}
                  src={layerSrc(template, "license-back", layer.file)}
                  alt=""
                  className={LAYER}
                />
              );
            }
            case "signature":
              if (!signatures?.[layer.slot]) return null;
              return (
                // biome-ignore lint/performance/noImgElement: fixed local SVG artwork layers, not content images
                <img
                  key={key}
                  src={`${ART}/${layer.file}`}
                  alt=""
                  className={LAYER}
                />
              );
            case "qr":
              return qrDataUrl ? (
                <svg
                  key={key}
                  viewBox="0 0 3450 2210"
                  className={LAYER}
                  fill="none"
                  role="presentation"
                  aria-hidden="true"
                >
                  <image
                    x={QR_RECT.x}
                    y={QR_RECT.y}
                    width={QR_RECT.w}
                    height={QR_RECT.h}
                    preserveAspectRatio="none"
                    href={qrDataUrl}
                  />
                </svg>
              ) : null;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
