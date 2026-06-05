// Faithful reproduction of the reference EMT license card: the original License
// SVG artwork layers (served from /public) with the record data overlaid as SVG
// text and the photo embedded via an SVG <image> — mirroring the reference
// LcnViewer. viewBox is 3450 x 2210; layers 0..21 are background, 22 is the
// foreground frame.

const LAYER = "absolute inset-0 h-full w-full";
const BG_LAYERS = Array.from({ length: 22 }, (_, i) => i); // 0..21

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
  const fontSize = upper.length > 28 ? 95 : upper.length > 21 ? 110 : 139;
  return (
    <svg {...svgProps()} aria-hidden="true">
      <text
        fill="#000"
        fontFamily="Arial, sans-serif"
        fontSize={fontSize}
        fontWeight="bold"
        textAnchor="middle"
      >
        <tspan x="2200" y="1080.89">
          {upper}
        </tspan>
      </text>
    </svg>
  );
}

function EmtPhoto({ photoUrl }: { photoUrl: string }) {
  return (
    <svg {...svgProps()} aria-hidden="true">
      <rect x="1" y="129" width="1016" height="1014" fill="url(#lic-photo)" />
      <defs>
        <pattern
          id="lic-photo"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            href="#lic-photo-img"
            transform="matrix(0.00390625 0 0 0.00391395 0 -0.000986193)"
          />
        </pattern>
        <image
          id="lic-photo-img"
          width="256"
          height="256"
          preserveAspectRatio="none"
          href={photoUrl}
        />
      </defs>
    </svg>
  );
}

export function LicenseCard({
  name,
  lcn,
  issued,
  expiration,
  photoUrl,
}: {
  name: string;
  lcn: string;
  issued: string | null;
  expiration: string | null;
  photoUrl: string | null;
  expired?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-outline-variant/60 bg-white shadow-[var(--shadow-clinical)] select-none">
      <div className="relative w-full" style={{ aspectRatio: "3450 / 2210" }}>
        {BG_LAYERS.map((i) => (
          // biome-ignore lint/performance/noImgElement: fixed local SVG artwork layers, not content images
          <img
            key={i}
            src={`/assets/svg/License/${i}.svg`}
            alt=""
            className={LAYER}
          />
        ))}
        {photoUrl && <EmtPhoto photoUrl={photoUrl} />}
        {issued && <DateIssue text={issued} />}
        {expiration && <DateExpiry text={expiration} />}
        <LcnNumber text={lcn} />
        <EmtName text={name} />
        {/* foreground frame */}
        {/* biome-ignore lint/performance/noImgElement: fixed local SVG frame layer */}
        <img src="/assets/svg/License/22.svg" alt="" className={LAYER} />
      </div>
    </div>
  );
}
