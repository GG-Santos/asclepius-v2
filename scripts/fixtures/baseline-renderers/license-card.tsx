// License ID card V2 — FRONT. The new layered artwork (public/assets/svg/
// LicenseV2/front, canvas 3450 × 2210) with live record data composited at
// the design's placeholder slots: photo, name, license number, and the
// issue/validity dates. The design kept the previous card's anchors for the
// photo rect and the LCN/date baselines, so those overlays carry over
// verbatim; the name moved onto the new name bar (centered, larger).
// Signature ink is admin-only; the digital-use warning is public-only — the
// design alternates them over the same signatory block.

const LAYER = "absolute inset-0 h-full w-full";
const ART = "/assets/svg/LicenseV2/front";

type LayerEntry =
  | { kind: "static"; file: string }
  | { kind: "signature"; file: string }
  | { kind: "warning"; file: string }
  | { kind: "photo" }
  | { kind: "name" }
  | { kind: "lcn" }
  | { kind: "date-issued" }
  | { kind: "date-validity" };

/** Exact artwork stacking order (design layers 1–27). Dynamic entries replace
 *  the design's sample placeholders at the same depth. */
const LAYERS: LayerEntry[] = [
  { kind: "static", file: "01-background.svg" },
  { kind: "static", file: "02-top-bar.svg" },
  { kind: "static", file: "03-title.svg" },
  { kind: "static", file: "04-subtitle.svg" },
  { kind: "static", file: "05-bar.svg" },
  { kind: "static", file: "06-address.svg" },
  { kind: "static", file: "07-main-logo.svg" },
  { kind: "static", file: "08-secondary-logo.svg" },
  { kind: "static", file: "09-name-bar.svg" },
  { kind: "name" },
  { kind: "static", file: "11-picture-border.svg" },
  { kind: "photo" },
  { kind: "static", file: "13-license-text-bar.svg" },
  { kind: "static", file: "13b-license-text.svg" },
  { kind: "static", file: "14-license-number-bar.svg" },
  { kind: "lcn" },
  { kind: "static", file: "16-training-bar.svg" },
  { kind: "static", file: "17-training-text.svg" },
  { kind: "static", file: "18-level-bar.svg" },
  { kind: "static", file: "19-level-text.svg" },
  { kind: "static", file: "20-date-bar.svg" },
  { kind: "static", file: "21-star-of-life.svg" },
  { kind: "date-issued" },
  { kind: "date-validity" },
  { kind: "static", file: "24-position-1.svg" },
  { kind: "static", file: "25-signatory-1.svg" },
  { kind: "signature", file: "26-signature-1.svg" },
  { kind: "warning", file: "27-warning.svg" },
];

/* Photo slot, identical to the previous card (design layers 11/12). */
const PHOTO_RECT = { x: 1, y: 129, w: 1016, h: 1014 };
/* Name bar (layer 9) center; sample text baseline. */
const NAME_CENTER_X = 2244;
const NAME_BASELINE = 1081;

function svgProps() {
  return {
    viewBox: "0 0 3450 2210",
    className: LAYER,
    fill: "none" as const,
    role: "presentation" as const,
    "aria-hidden": true as const,
  };
}

function DateIssue({ text }: { text: string }) {
  return (
    <svg {...svgProps()} aria-hidden="true">
      <text
        fill="#000"
        fontFamily="Calibri, Arial, sans-serif"
        fontSize="68"
        letterSpacing="-0.012em"
      >
        <tspan x="158.583" y="1603.5">
          Date Issued: {text}
        </tspan>
      </text>
    </svg>
  );
}

function DateExpiry({ text }: { text: string }) {
  return (
    <svg {...svgProps()} aria-hidden="true">
      <text
        fill="#000"
        fontFamily="Calibri, Arial, sans-serif"
        fontSize="68"
        letterSpacing="-0.012em"
      >
        <tspan x="177.599" y="1691.5">
          Valid Until: {text}
        </tspan>
      </text>
    </svg>
  );
}

function LcnNumber({ text }: { text: string }) {
  const fontSize = text.length > 10 ? 85 : text.length > 7 ? 125 : 139;
  return (
    <svg {...svgProps()} aria-hidden="true">
      <text
        fill="#000"
        fontFamily="Arial, sans-serif"
        fontSize={fontSize}
        fontWeight="bold"
        letterSpacing="0.012em"
      >
        <tspan x="174.79" y="1443.15">
          {text}
        </tspan>
      </text>
    </svg>
  );
}

function EmtName({ text }: { text: string }) {
  const upper = text.toUpperCase();
  // Keep long names inside the name bar (~2300 usable px at this anchor).
  const fontSize =
    upper.length > 32
      ? 88
      : upper.length > 26
        ? 105
        : upper.length > 21
          ? 130
          : 160;
  return (
    <svg {...svgProps()} aria-hidden="true">
      <text
        fill="#000"
        fontFamily="Arial, sans-serif"
        fontSize={fontSize}
        fontWeight="bold"
        textAnchor="middle"
      >
        <tspan x={NAME_CENTER_X} y={NAME_BASELINE}>
          {upper}
        </tspan>
      </text>
    </svg>
  );
}

function EmtPhoto({ photoUrl }: { photoUrl: string }) {
  return (
    <svg {...svgProps()} aria-hidden="true">
      {/* Fit the whole portrait inside the slot (scaled to height; sides
          letterbox if narrower) — never stretch or crop the person. */}
      <image
        x={PHOTO_RECT.x}
        y={PHOTO_RECT.y}
        width={PHOTO_RECT.w}
        height={PHOTO_RECT.h}
        preserveAspectRatio="xMidYMid meet"
        href={photoUrl}
      />
    </svg>
  );
}

export function LicenseCard({
  name,
  lcn,
  issued,
  expiration,
  photoUrl,
  signature = false,
  warningOverlay = false,
  frameless = false,
}: {
  name: string;
  lcn: string;
  issued: string | null;
  expiration: string | null;
  photoUrl: string | null;
  expired?: boolean;
  /** Admin-only: render the course director's ink-signature layer. */
  signature?: boolean;
  /** Public-only digital-use warning printed over the signatory block. */
  warningOverlay?: boolean;
  /** Print mode: no screen chrome (radius/border/shadow) — used for PNG export. */
  frameless?: boolean;
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
            case "signature":
              if (!signature) return null;
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
            case "photo":
              return photoUrl ? (
                <EmtPhoto key={key} photoUrl={photoUrl} />
              ) : null;
            case "name":
              return <EmtName key={key} text={name} />;
            case "lcn":
              return <LcnNumber key={key} text={lcn} />;
            case "date-issued":
              return issued ? <DateIssue key={key} text={issued} /> : null;
            case "date-validity":
              return expiration ? (
                <DateExpiry key={key} text={expiration} />
              ) : null;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
