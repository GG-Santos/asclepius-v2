// Certificate V2 — the new layered artwork (public/assets/svg/CertificateV2,
// canvas 6900×5209) with live record data composited at the design's
// placeholder slots: photo, name, award date, license number, and an
// embedded verification QR (the design's QR-logo layer sits on top of it).
// Signature layers are admin-only — never rendered on the public surface.

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function yearInWords(year: number): string {
  if (year >= 2000 && year < 2100) {
    const lastTwo = year % 100;
    if (lastTwo === 0) return "Two Thousand";
    if (lastTwo < 20) return `Two Thousand ${ONES[lastTwo]}`;
    const tens = Math.floor(lastTwo / 10);
    const ones = lastTwo % 10;
    return `Two Thousand ${TENS[tens]}${ones > 0 ? `-${ONES[ones]}` : ""}`;
  }
  return String(year);
}

function dayWithSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

const LAYER = "absolute inset-0 h-full w-full";
const ART = "/assets/svg/CertificateV2";

export type SignatureSlot = "one" | "two" | "three";
export type SignatureVisibility = Partial<Record<SignatureSlot, boolean>>;

type LayerEntry =
  | { kind: "static"; file: string }
  | { kind: "signature"; file: string; slot: SignatureSlot }
  | { kind: "warning"; file: string }
  | { kind: "photo" }
  | { kind: "photo-watermark" }
  | { kind: "name" }
  | { kind: "date" }
  | { kind: "lcn" }
  | { kind: "qr" };

/** Exact artwork stacking order (1 = back, 36 = front). Dynamic entries
 *  replace the design's sample placeholders at the same depth. */
const LAYERS: LayerEntry[] = [
  { kind: "static", file: "01-background.svg" },
  { kind: "static", file: "02-main-logo-watermark.svg" },
  { kind: "static", file: "03-secondary-logo.svg" },
  { kind: "static", file: "04-tertiary-logo.svg" },
  { kind: "photo" },
  { kind: "static", file: "06-training-center-name.svg" },
  { kind: "static", file: "07-certificate-type.svg" },
  { kind: "static", file: "08-to.svg" },
  { kind: "name" },
  { kind: "static", file: "10-this.svg" },
  { kind: "static", file: "11-completion-text.svg" },
  { kind: "static", file: "12a-center-bar.svg" },
  { kind: "static", file: "12b-training-text.svg" },
  { kind: "static", file: "13-recognition-text.svg" },
  { kind: "date" },
  { kind: "static", file: "15-position-1.svg" },
  { kind: "static", file: "16-signatory-1.svg" },
  { kind: "signature", file: "17-signature-1.svg", slot: "one" },
  { kind: "static", file: "18-position-2.svg" },
  { kind: "static", file: "19-signatory-2.svg" },
  { kind: "signature", file: "20-signature-2.svg", slot: "two" },
  { kind: "static", file: "21-position-3.svg" },
  { kind: "static", file: "22-signatory-3.svg" },
  { kind: "signature", file: "22b-signature-3.svg", slot: "three" },
  { kind: "static", file: "23-border-main.svg" },
  { kind: "static", file: "24-border-triangle-left.svg" },
  { kind: "static", file: "25-border-triangle-right.svg" },
  { kind: "static", file: "26-border-top.svg" },
  { kind: "photo-watermark" },
  { kind: "static", file: "28-border-liner.svg" },
  { kind: "static", file: "29-border-banner.svg" },
  { kind: "static", file: "30-main-logo-banner.svg" },
  { kind: "static", file: "31-accrediation-logo-1.svg" },
  { kind: "static", file: "32-watermark.svg" },
  { kind: "static", file: "33-license-label.svg" },
  { kind: "lcn" },
  { kind: "qr" },
  { kind: "static", file: "36-qr-logo.svg" },
  { kind: "warning", file: "37-warning.svg" },
];

/* Placeholder slot geometry, measured from the design's sample layers. */
const PHOTO_RECT = { x: 261, y: 1498, w: 1200, h: 1200 };
const PHOTO_WM_RECT = { x: 5098, y: 3483, w: 1675, h: 1675 };
const QR_RECT = { x: 790, y: 3424, w: 786, h: 786 };

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 6900 5209"
      className={LAYER}
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CertName({ name }: { name: string }) {
  return (
    <Overlay>
      <text
        fill="#1a1a1a"
        fontFamily="'Copperplate Gothic Bold', Georgia, serif"
        fontSize="269"
        fontWeight="bold"
        textAnchor="middle"
      >
        <tspan x="3450" y="2252.03">
          {name.toUpperCase()}
        </tspan>
      </text>
    </Overlay>
  );
}

function CertBody({ issued }: { issued: string | null }) {
  let formatted = issued ?? "";
  let year = 0;
  if (issued) {
    const parsed = new Date(issued.replace(/sept\b/gi, "Sep"));
    if (!Number.isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      const month = parsed.toLocaleString("default", { month: "long" });
      formatted = `${dayWithSuffix(parsed.getDate())} day of ${month}`;
    }
  }
  const words = yearInWords(year);
  return (
    <Overlay>
      <text
        fill="#1a1a1a"
        fontFamily="'Lucida Calligraphy', 'Brush Script MT', cursive"
        fontSize="68"
        fontWeight="bold"
        fontStyle="italic"
        textAnchor="middle"
      >
        <tspan x="3450" y="3548.17">
          Awarded this {formatted}{" "}
          {year ? `in the year of our Lord ${words}` : ""}.
        </tspan>
        <tspan x="3450" y="3628.17">
          Given at the WSL EMS Safety &amp; Rescue Training Center,
        </tspan>
        <tspan x="3450" y="3708.17">
          2A Wellgoco Bldg., Instruccion Street, España Avenue, Sampaloc Manila
        </tspan>
      </text>
    </Overlay>
  );
}

function CertNumber({ lcn }: { lcn: string }) {
  return (
    <Overlay>
      <text
        fill="#1a1a1a"
        fontFamily="Arial, sans-serif"
        fontSize="200"
        fontWeight="bold"
      >
        <tspan x="611" y="4517">
          {lcn}
        </tspan>
      </text>
    </Overlay>
  );
}

function CertPhoto({
  photoUrl,
  rect,
  opacity,
  variant,
}: {
  photoUrl: string;
  rect: { x: number; y: number; w: number; h: number };
  opacity: number;
  variant: string;
}) {
  const id = `certv2-photo-${variant}`;
  return (
    <Overlay>
      <image
        id={id}
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        preserveAspectRatio="xMidYMid meet"
        opacity={opacity}
        href={photoUrl}
      />
    </Overlay>
  );
}

export function Certificate({
  name,
  lcn,
  issued,
  photoUrl,
  qrDataUrl = null,
  signatures,
  warningOverlay = false,
  frameless = false,
}: {
  name: string;
  lcn: string;
  issued: string | null;
  photoUrl: string | null;
  /** Verification QR (generated, #0d1671, ECC-H) embedded at the design's QR slot. */
  qrDataUrl?: string | null;
  /**
   * Admin-only, per-slot signature visibility ({ one, two, three }). Omitted
   * (the public surface) means NO signature layer ever renders.
   */
  signatures?: SignatureVisibility;
  /** Public-only warning overlay (topmost layer). Admin previews/exports omit it. */
  warningOverlay?: boolean;
  /** Print mode: no screen chrome (radius/border/shadow) — used for PNG export. */
  frameless?: boolean;
}) {
  return (
    <div
      className={
        frameless
          ? "mx-auto w-full max-w-3xl select-none bg-white"
          : "mx-auto w-full max-w-3xl select-none overflow-hidden rounded-lg border border-outline-variant/60 bg-white shadow-[var(--shadow-clinical)]"
      }
    >
      <div className="relative w-full" style={{ aspectRatio: "6900 / 5209" }}>
        {LAYERS.map((layer, i) => {
          const key = `layer-${i}`;
          switch (layer.kind) {
            case "static":
              return (
                // biome-ignore lint/performance/noImgElement: fixed local SVG artwork layers, not content images
                <img
                  key={key}
                  src={`${ART}/${layer.file}`}
                  alt=""
                  className={LAYER}
                />
              );
            case "warning":
              if (!warningOverlay) return null;
              return (
                // biome-ignore lint/performance/noImgElement: fixed local SVG artwork layers, not content images
                <img
                  key={key}
                  src={`${ART}/${layer.file}`}
                  alt=""
                  className={LAYER}
                />
              );
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
            case "photo":
              return photoUrl ? (
                <CertPhoto
                  key={key}
                  photoUrl={photoUrl}
                  rect={PHOTO_RECT}
                  opacity={1}
                  variant="main"
                />
              ) : null;
            case "photo-watermark":
              return photoUrl ? (
                <CertPhoto
                  key={key}
                  photoUrl={photoUrl}
                  rect={PHOTO_WM_RECT}
                  opacity={0.3}
                  variant="wm"
                />
              ) : null;
            case "name":
              return <CertName key={key} name={name} />;
            case "date":
              return <CertBody key={key} issued={issued} />;
            case "lcn":
              return <CertNumber key={key} lcn={lcn} />;
            case "qr":
              return qrDataUrl ? (
                <Overlay key={key}>
                  <image
                    x={QR_RECT.x}
                    y={QR_RECT.y}
                    width={QR_RECT.w}
                    height={QR_RECT.h}
                    preserveAspectRatio="none"
                    href={qrDataUrl}
                  />
                </Overlay>
              ) : null;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
