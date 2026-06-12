// Dev utility: estimate the union bounding box of all <path> data in artwork
// SVG layers. Used once to measure text-element anchors for the artifact
// template manifest (src/lib/artifact-template/defaults.ts). Control points
// of curves are included, so boxes overestimate slightly — acceptable for
// anchor placement, which Wave 8 attestation reviews visually.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "public", "assets", "svg");

const FILES = [
  "CertificateV2/06-training-center-name.svg",
  "CertificateV2/15-position-1.svg",
  "CertificateV2/16-signatory-1.svg",
  "CertificateV2/18-position-2.svg",
  "CertificateV2/19-signatory-2.svg",
  "CertificateV2/21-position-3.svg",
  "CertificateV2/22-signatory-3.svg",
  "LicenseV2/front/06-address.svg",
  "LicenseV2/front/24-position-1.svg",
  "LicenseV2/front/25-signatory-1.svg",
  "LicenseV2/back/03-training-center-text.svg",
  "LicenseV2/back/08-position-1.svg",
  "LicenseV2/back/09-signatory-1.svg",
  "LicenseV2/back/12-position-2.svg",
  "LicenseV2/back/13-signatory-2.svg",
];

type Box = { minX: number; minY: number; maxX: number; maxY: number };

function walkPath(d: string, box: Box): void {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const pt = (px: number, py: number) => {
    box.minX = Math.min(box.minX, px);
    box.minY = Math.min(box.minY, py);
    box.maxX = Math.max(box.maxX, px);
    box.maxY = Math.max(box.maxY, py);
  };
  const num = () => Number.parseFloat(tokens[i++] ?? "0");
  while (i < tokens.length) {
    const t = tokens[i];
    if (t && /[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "z" || cmd === "Z") {
        x = startX;
        y = startY;
        continue;
      }
    }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M":
      case "L": {
        const nx = num();
        const ny = num();
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        if (cmd.toUpperCase() === "M") {
          startX = x;
          startY = y;
          cmd = rel ? "l" : "L"; // implicit lineto after moveto
        }
        pt(x, y);
        break;
      }
      case "H": {
        const nx = num();
        x = rel ? x + nx : nx;
        pt(x, y);
        break;
      }
      case "V": {
        const ny = num();
        y = rel ? y + ny : ny;
        pt(x, y);
        break;
      }
      case "C": {
        for (let k = 0; k < 3; k++) {
          const nx = num();
          const ny = num();
          const px = rel ? x + nx : nx;
          const py = rel ? y + ny : ny;
          pt(px, py);
          if (k === 2) {
            x = px;
            y = py;
          }
        }
        break;
      }
      case "S":
      case "Q": {
        for (let k = 0; k < 2; k++) {
          const nx = num();
          const ny = num();
          const px = rel ? x + nx : nx;
          const py = rel ? y + ny : ny;
          pt(px, py);
          if (k === 1) {
            x = px;
            y = py;
          }
        }
        break;
      }
      case "T": {
        const nx = num();
        const ny = num();
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        pt(x, y);
        break;
      }
      case "A": {
        num(); // rx
        num(); // ry
        num(); // rotation
        num(); // large-arc
        num(); // sweep
        const nx = num();
        const ny = num();
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        pt(x, y);
        break;
      }
      default:
        i++; // unknown token — skip
    }
  }
}

const out: Record<string, unknown> = {};
for (const rel of FILES) {
  const svg = readFileSync(join(ROOT, rel), "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? null;
  const box: Box = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
  for (const m of svg.matchAll(/\sd="([^"]+)"/g)) {
    walkPath(m[1] ?? "", box);
  }
  out[rel] = Number.isFinite(box.minX)
    ? {
        viewBox,
        bbox: {
          x: Math.round(box.minX),
          y: Math.round(box.minY),
          w: Math.round(box.maxX - box.minX),
          h: Math.round(box.maxY - box.minY),
        },
      }
    : { viewBox, error: "no path data" };
}
console.log(JSON.stringify(out, null, 2));
