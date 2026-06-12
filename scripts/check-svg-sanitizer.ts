// Wave-5 gate (R8): the SVG sanitizer must neutralize every malicious
// fixture (scripts, event handlers, foreignObject, external references),
// the byte sniffer must identify real types, and the config validator must
// reject protected layers, unknown elements, bad colors, and unsanitized
// asset URLs.

import type { ArtifactTemplateConfig } from "../src/lib/artifact-template/types";
import { validateTemplateConfig } from "../src/lib/artifact-template/validate";
import { sanitizeSvg, sniffTemplateAsset } from "../src/lib/svg-sanitize";

const failures: string[] = [];

// ── Sanitizer fixtures ───────────────────────────────────────────────────
const MALICIOUS: { name: string; svg: string; mustNotContain: RegExp[] }[] = [
  {
    name: "script tag",
    svg: `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>`,
    mustNotContain: [/<script/i, /alert\(/],
  },
  {
    name: "event handler",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="5" onclick="steal()"/></svg>`,
    mustNotContain: [/onload=/i, /onclick=/i],
  },
  {
    name: "foreignObject payload",
    svg: `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror="alert(1)"/></body></foreignObject></svg>`,
    mustNotContain: [/<foreignObject/i, /onerror=/i],
  },
  {
    name: "external image reference",
    svg: `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.svg" width="10" height="10"/></svg>`,
    mustNotContain: [/evil\.example/],
  },
  {
    name: "javascript: use href",
    svg: `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>x</text></a><use xlink:href="#y"/></svg>`,
    mustNotContain: [/javascript:/i, /<use/i],
  },
];

for (const fixture of MALICIOUS) {
  try {
    const clean = sanitizeSvg(fixture.svg);
    for (const pattern of fixture.mustNotContain) {
      if (pattern.test(clean)) {
        failures.push(`${fixture.name}: "${pattern}" survived sanitization`);
      }
    }
  } catch {
    // Throwing on garbage is acceptable rejection.
  }
}

// Benign SVG survives with its shape intact.
try {
  const clean = sanitizeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z" fill="#123456"/></svg>`,
  );
  if (!/<path/.test(clean) || !/#123456/.test(clean)) {
    failures.push("benign SVG: content was destroyed by sanitization");
  }
} catch (err) {
  failures.push(`benign SVG: sanitizer threw (${String(err)})`);
}

// Non-SVG input throws.
try {
  sanitizeSvg("<html><body>not svg</body></html>");
  failures.push("non-SVG markup: expected sanitizeSvg to throw");
} catch {
  // expected
}

// ── Sniffer ──────────────────────────────────────────────────────────────
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
if (sniffTemplateAsset(pngBytes) !== "image/png") {
  failures.push("sniffer: PNG signature not detected");
}
const svgBytes = new TextEncoder().encode(
  `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>`,
);
if (sniffTemplateAsset(svgBytes) !== "image/svg+xml") {
  failures.push("sniffer: SVG document not detected");
}
const junk = new TextEncoder().encode("GIF89a not allowed");
if (sniffTemplateAsset(junk) !== null) {
  failures.push("sniffer: junk bytes accepted");
}

// ── Config validation ────────────────────────────────────────────────────
const okUrl =
  "https://store.public.blob.vercel-storage.com/template-assets/abc.svg";
const allow = (url: string) => url === okUrl;

function cfg(partial: Partial<ArtifactTemplateConfig>): ArtifactTemplateConfig {
  return {
    schemaVersion: 1,
    textOverrides: {},
    overlayColors: {},
    layerReplacements: {},
    ...partial,
  };
}

const cases: { name: string; config: ArtifactTemplateConfig; ok: boolean }[] = [
  { name: "empty config", config: cfg({}), ok: true },
  {
    name: "valid replacement",
    config: cfg({
      layerReplacements: {
        "certificate/02-main-logo-watermark.svg": {
          url: okUrl,
          contentType: "image/svg+xml",
        },
      },
    }),
    ok: true,
  },
  {
    name: "protected QR layer",
    config: cfg({
      layerReplacements: {
        "certificate/36-qr-logo.svg": {
          url: okUrl,
          contentType: "image/svg+xml",
        },
      },
    }),
    ok: false,
  },
  {
    name: "unsanitized URL",
    config: cfg({
      layerReplacements: {
        "license-front/07-main-logo.svg": {
          url: "https://store.public.blob.vercel-storage.com/raw/evil.svg",
          contentType: "image/svg+xml",
        },
      },
    }),
    ok: false,
  },
  {
    name: "unknown text element",
    config: cfg({ textOverrides: { "no-such-element": { text: "x" } } }),
    ok: false,
  },
  {
    name: "valid text override",
    config: cfg({
      textOverrides: { "cert-center-name": { text: "ACME TRAINING CENTER" } },
    }),
    ok: true,
  },
  {
    name: "overlong text",
    config: cfg({
      textOverrides: { "cert-center-name": { text: "X".repeat(500) } },
    }),
    ok: false,
  },
  {
    name: "bad color",
    config: cfg({
      textOverrides: { "cert-center-name": { color: "red" } },
    }),
    ok: false,
  },
  {
    name: "valid overlay color",
    config: cfg({ overlayColors: { "cert-name": "#aa2222" } }),
    ok: true,
  },
  {
    name: "unknown overlay key",
    config: cfg({
      overlayColors: {
        nope: "#aa2222",
      } as ArtifactTemplateConfig["overlayColors"],
    }),
    ok: false,
  },
];

for (const c of cases) {
  const errors = validateTemplateConfig(c.config, allow);
  const passed = errors.length === 0;
  if (passed !== c.ok) {
    failures.push(
      `config "${c.name}": expected ${c.ok ? "valid" : "invalid"}, got ${JSON.stringify(errors)}`,
    );
  }
}

if (failures.length > 0) {
  console.error("SVG SANITIZER / CONFIG CHECK FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `Sanitizer check passed: ${MALICIOUS.length} malicious fixtures neutralized, sniffer + ${cases.length} config validation cases green.`,
);
