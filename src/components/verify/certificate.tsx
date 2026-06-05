// Faithful reproduction of the reference certificate: the original SVG artwork
// layers (served from /public, not bundled) with the record data overlaid as
// SVG text, and the photo embedded via an SVG <image> (which the browser
// fetches directly, bypassing the Next image optimizer).

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
const LAYERS = Array.from({ length: 23 }, (_, i) => i); // 0..22 artwork

function CertName({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 6900 5209"
      className={LAYER}
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
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
    </svg>
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
    <svg
      viewBox="0 0 6900 5209"
      className={LAYER}
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
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
    </svg>
  );
}

function CertNumber({ lcn }: { lcn: string }) {
  return (
    <svg
      viewBox="0 0 6900 5209"
      className={LAYER}
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      <text
        fill="#1a1a1a"
        fontFamily="Arial, sans-serif"
        fontSize="116"
        fontWeight="bold"
      >
        <tspan x="1413" y="4413">
          {lcn}
        </tspan>
      </text>
    </svg>
  );
}

function CertPhoto({
  photoUrl,
  variant,
}: {
  photoUrl: string;
  variant: "a" | "b";
}) {
  const id = `cert-photo-${variant}`;
  const rect =
    variant === "a"
      ? {
          x: 268,
          y: 1487,
          w: 1202,
          h: 1250,
          m: "matrix(0.00406224 0 0 0.00390625 -0.0199667 0)",
          o: 1,
        }
      : {
          x: 5057,
          y: 3384,
          w: 1650,
          h: 1716,
          m: "matrix(0.0040625 0 0 0.00390625 -0.02 0)",
          o: 0.3,
        };
  return (
    <svg
      viewBox="0 0 6900 5209"
      className={LAYER}
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        fill={`url(#${id})`}
        fillOpacity={rect.o}
      />
      <defs>
        <pattern
          id={id}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use href={`#${id}-img`} transform={rect.m} />
        </pattern>
        <image
          id={`${id}-img`}
          width="256"
          height="256"
          preserveAspectRatio="none"
          href={photoUrl}
        />
      </defs>
    </svg>
  );
}

export function Certificate({
  name,
  lcn,
  issued,
  photoUrl,
}: {
  name: string;
  lcn: string;
  issued: string | null;
  photoUrl: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-outline-variant/60 bg-white shadow-[var(--shadow-clinical)] select-none">
      <div className="relative w-full" style={{ aspectRatio: "6900 / 5209" }}>
        {LAYERS.map((i) => (
          // biome-ignore lint/performance/noImgElement: fixed local SVG artwork layers, not content images
          <img
            key={i}
            src={`/assets/svg/Certificate/${i}.svg`}
            alt=""
            className={LAYER}
          />
        ))}
        <CertName name={name} />
        <CertBody issued={issued} />
        <CertNumber lcn={lcn} />
        {photoUrl && <CertPhoto photoUrl={photoUrl} variant="a" />}
        {photoUrl && <CertPhoto photoUrl={photoUrl} variant="b" />}
        {/* biome-ignore lint/performance/noImgElement: fixed local SVG frame layer */}
        <img src="/assets/svg/Certificate/23.svg" alt="" className={LAYER} />
      </div>
    </div>
  );
}
