// Built-in template manifest. Enumerates every static artwork layer of the
// three artifacts (replaceable set + fixed set) and every configurable text
// element with its MEASURED anchor (path-bbox measurement of the baked
// outline artwork, scripts/measure-svg-bbox.ts) and declared web-font stack.
//
// QR-logo layers (CertificateV2/36-qr-logo.svg, LicenseV2/back/07-qr-logo.svg)
// are intentionally NOT in the replaceable set: they sit over the QR center
// and rely on ECC-H error correction — replacing them risks scan failures.
import type {
  ArtifactId,
  OverlayColorKey,
  ReplaceableLayerSpec,
  TextElementSpec,
} from "./types";

export const ARTIFACT_CANVAS: Record<ArtifactId, { w: number; h: number }> = {
  certificate: { w: 6900, h: 5209 },
  "license-front": { w: 3450, h: 2210 },
  "license-back": { w: 3450, h: 2210 },
};

export const ART_BASE: Record<ArtifactId, string> = {
  certificate: "/assets/svg/CertificateV2",
  "license-front": "/assets/svg/LicenseV2/front",
  "license-back": "/assets/svg/LicenseV2/back",
};

/** Layers that may NEVER be replaced (QR scan-reliability). */
export const PROTECTED_LAYERS: Record<ArtifactId, string[]> = {
  certificate: ["36-qr-logo.svg"],
  "license-front": [],
  "license-back": ["07-qr-logo.svg"],
};

const cert = (
  file: string,
  label: string,
  kind: ReplaceableLayerSpec["kind"],
) =>
  ({
    file,
    artifact: "certificate",
    label,
    kind,
  }) satisfies ReplaceableLayerSpec;
const lf = (file: string, label: string, kind: ReplaceableLayerSpec["kind"]) =>
  ({
    file,
    artifact: "license-front",
    label,
    kind,
  }) satisfies ReplaceableLayerSpec;
const lb = (file: string, label: string, kind: ReplaceableLayerSpec["kind"]) =>
  ({
    file,
    artifact: "license-back",
    label,
    kind,
  }) satisfies ReplaceableLayerSpec;

/**
 * Every static layer an admin may replace wholesale with an uploaded image.
 * Signature and warning layers are excluded (visibility-controlled artifacts
 * of record), as are the protected QR-logo layers.
 */
export const REPLACEABLE_LAYERS: ReplaceableLayerSpec[] = [
  // Certificate (canvas 6900×5209)
  cert("01-background.svg", "Background", "decor"),
  cert("02-main-logo-watermark.svg", "Main logo watermark", "logo"),
  cert("03-secondary-logo.svg", "Secondary logo", "logo"),
  cert("04-tertiary-logo.svg", "Tertiary logo", "logo"),
  cert(
    "06-training-center-name.svg",
    "Training center name (artwork)",
    "text-art",
  ),
  cert("07-certificate-type.svg", "Certificate type heading", "text-art"),
  cert("08-to.svg", "“This certificate is awarded to” text", "text-art"),
  cert("10-this.svg", "“This” text", "text-art"),
  cert("11-completion-text.svg", "Completion text", "text-art"),
  cert("12a-center-bar.svg", "Center bar", "decor"),
  cert("12b-training-text.svg", "Training text", "text-art"),
  cert("13-recognition-text.svg", "Recognition text", "text-art"),
  cert("15-position-1.svg", "Signatory 1 position (artwork)", "text-art"),
  cert("16-signatory-1.svg", "Signatory 1 name (artwork)", "text-art"),
  cert("18-position-2.svg", "Signatory 2 position (artwork)", "text-art"),
  cert("19-signatory-2.svg", "Signatory 2 name (artwork)", "text-art"),
  cert("21-position-3.svg", "Signatory 3 position (artwork)", "text-art"),
  cert("22-signatory-3.svg", "Signatory 3 name (artwork)", "text-art"),
  cert("23-border-main.svg", "Main border", "decor"),
  cert("24-border-triangle-left.svg", "Border triangle left", "decor"),
  cert("25-border-triangle-right.svg", "Border triangle right", "decor"),
  cert("26-border-top.svg", "Border top", "decor"),
  cert("28-border-liner.svg", "Border liner", "decor"),
  cert("29-border-banner.svg", "Border banner", "decor"),
  cert("30-main-logo-banner.svg", "Banner logo", "logo"),
  cert("31-accrediation-logo-1.svg", "Accreditation logo", "logo"),
  cert("32-watermark.svg", "Watermark", "decor"),
  cert("33-license-label.svg", "License label", "text-art"),
  // License front (canvas 3450×2210)
  lf("01-background.svg", "Background", "decor"),
  lf("02-top-bar.svg", "Top bar", "decor"),
  lf("03-title.svg", "Title", "text-art"),
  lf("04-subtitle.svg", "Subtitle", "text-art"),
  lf("06-address.svg", "Address (artwork)", "text-art"),
  lf("07-main-logo.svg", "Main logo", "logo"),
  lf("08-secondary-logo.svg", "Secondary logo", "logo"),
  lf("09-name-bar.svg", "Name bar", "decor"),
  lf("11-picture-border.svg", "Picture border", "decor"),
  lf("13-license-text-bar.svg", "License text bar", "decor"),
  lf("13b-license-text.svg", "License text", "text-art"),
  lf("14-license-number-bar.svg", "License number bar", "decor"),
  lf("16-training-bar.svg", "Training bar", "decor"),
  lf("17-training-text.svg", "Training text", "text-art"),
  lf("18-level-bar.svg", "Level bar", "decor"),
  lf("19-level-text.svg", "Level text", "text-art"),
  lf("20-date-bar.svg", "Date bar", "decor"),
  lf("21-star-of-life.svg", "Star of Life emblem", "logo"),
  lf("24-position-1.svg", "Signatory position (artwork)", "text-art"),
  lf("25-signatory-1.svg", "Signatory name (artwork)", "text-art"),
  // License back (canvas 3450×2210)
  lb("01-background.svg", "Background", "decor"),
  lb("02-main-logo-watermark.svg", "Logo watermark", "logo"),
  lb(
    "03-training-center-text.svg",
    "Training center name (artwork)",
    "text-art",
  ),
  lb("04-certification-text.svg", "Certification text", "text-art"),
  lb("05-objectives.svg", "Objectives text", "text-art"),
  lb("08-position-1.svg", "Signatory 1 position (artwork)", "text-art"),
  lb("09-signatory-1.svg", "Signatory 1 name (artwork)", "text-art"),
  lb("10-line-1.svg", "Signature line 1", "decor"),
  lb("12-position-2.svg", "Signatory 2 position (artwork)", "text-art"),
  lb("13-signatory-2.svg", "Signatory 2 name (artwork)", "text-art"),
  lb("14-line-2.svg", "Signature line 2", "decor"),
];

/* Declared close web-font stacks. The baked artwork is outlined glyphs, so
   overridden text renders in these stacks — close match, not pixel-identical
   (accepted at spec time; defaults keep the untouched artwork). */
const ENGRAVED = "'Copperplate Gothic Bold', 'Copperplate', Georgia, serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

/**
 * Configurable text elements. Anchors measured from the baked artwork
 * (path-bbox): x = block center, y = baseline (bbox bottom).
 */
export const TEXT_ELEMENTS: TextElementSpec[] = [
  {
    id: "cert-center-name",
    artifact: "certificate",
    label: "Training center name",
    suppressesLayer: "06-training-center-name.svg",
    anchor: { x: 3460, y: 1281 },
    align: "middle",
    fontFamily: ENGRAVED,
    fontSize: 180,
    fontWeight: "bold",
    maxWidth: 3350,
    maxLength: 60,
    defaultColor: "#1a1a1a",
    defaultText: "WSL EMS SAFETY & RESCUE TRAINING CENTER",
  },
  {
    id: "cert-body-location",
    artifact: "certificate",
    label: "Award body — venue lines",
    suppressesLayer: "", // dynamic JSX text inside the certificate body overlay
    anchor: { x: 3450, y: 3628 },
    align: "middle",
    fontFamily: SERIF,
    fontSize: 68,
    fontWeight: "bold",
    fontStyle: "italic",
    maxWidth: 4200,
    maxLength: 90,
    multiline: { maxLines: 2, lineHeight: 80 },
    defaultColor: "#1a1a1a",
    defaultText:
      "Given at the WSL EMS Safety & Rescue Training Center,\n2A Wellgoco Bldg., Instruccion Street, España Avenue, Sampaloc Manila",
  },
  {
    id: "cert-signatory-1",
    artifact: "certificate",
    label: "Signatory 1 — name",
    suppressesLayer: "16-signatory-1.svg",
    anchor: { x: 3456, y: 4210 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 118,
    fontWeight: "bold",
    maxWidth: 1600,
    maxLength: 45,
    defaultColor: "#1a1a1a",
    defaultText: "",
  },
  {
    id: "cert-position-1",
    artifact: "certificate",
    label: "Signatory 1 — position",
    suppressesLayer: "15-position-1.svg",
    anchor: { x: 3468, y: 4306 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 86,
    maxWidth: 1600,
    maxLength: 45,
    defaultColor: "#1a1a1a",
    defaultText: "",
  },
  {
    id: "cert-signatory-2",
    artifact: "certificate",
    label: "Signatory 2 — name",
    suppressesLayer: "19-signatory-2.svg",
    anchor: { x: 2651, y: 4778 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 120,
    fontWeight: "bold",
    maxWidth: 1500,
    maxLength: 45,
    defaultColor: "#1a1a1a",
    defaultText: "",
  },
  {
    id: "cert-position-2",
    artifact: "certificate",
    label: "Signatory 2 — position",
    suppressesLayer: "18-position-2.svg",
    anchor: { x: 2672, y: 4874 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 89,
    maxWidth: 1500,
    maxLength: 45,
    defaultColor: "#1a1a1a",
    defaultText: "",
  },
  {
    id: "cert-signatory-3",
    artifact: "certificate",
    label: "Signatory 3 — name",
    suppressesLayer: "22-signatory-3.svg",
    anchor: { x: 4416, y: 4782 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 126,
    fontWeight: "bold",
    maxWidth: 1500,
    maxLength: 45,
    defaultColor: "#1a1a1a",
    defaultText: "",
  },
  {
    id: "cert-position-3",
    artifact: "certificate",
    label: "Signatory 3 — position",
    suppressesLayer: "21-position-3.svg",
    anchor: { x: 4435, y: 4879 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 69,
    maxWidth: 1500,
    maxLength: 45,
    defaultColor: "#1a1a1a",
    defaultText: "",
  },
  {
    id: "license-address",
    artifact: "license-front",
    label: "Address",
    suppressesLayer: "06-address.svg",
    anchor: { x: 2235, y: 692 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 40,
    maxWidth: 1100,
    maxLength: 60,
    multiline: { maxLines: 3, lineHeight: 47 },
    defaultColor: "#000000",
    defaultText:
      "2A Wellgoco Bldg., Instruccion Street,\nEspaña Avenue, Sampaloc Manila",
  },
  {
    id: "license-signatory-1",
    artifact: "license-front",
    label: "Signatory — name",
    suppressesLayer: "25-signatory-1.svg",
    anchor: { x: 2226, y: 2010 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 74,
    fontWeight: "bold",
    maxWidth: 1850,
    maxLength: 55,
    defaultColor: "#000000",
    defaultText: "",
  },
  {
    id: "license-position-1",
    artifact: "license-front",
    label: "Signatory — position",
    suppressesLayer: "24-position-1.svg",
    anchor: { x: 2218, y: 2072 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 58,
    maxWidth: 1850,
    maxLength: 55,
    defaultColor: "#000000",
    defaultText: "",
  },
  {
    id: "license-back-center-name",
    artifact: "license-back",
    label: "Training center name",
    suppressesLayer: "03-training-center-text.svg",
    anchor: { x: 1726, y: 274 },
    align: "middle",
    fontFamily: ENGRAVED,
    fontSize: 96,
    fontWeight: "bold",
    maxWidth: 1750,
    maxLength: 60,
    defaultColor: "#000000",
    defaultText: "WSL EMS SAFETY & RESCUE TRAINING CENTER",
  },
  {
    id: "license-back-signatory-1",
    artifact: "license-back",
    label: "Signatory 1 — name",
    suppressesLayer: "09-signatory-1.svg",
    anchor: { x: 848, y: 1872 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 70,
    fontWeight: "bold",
    maxWidth: 950,
    maxLength: 45,
    defaultColor: "#000000",
    defaultText: "",
  },
  {
    id: "license-back-position-1",
    artifact: "license-back",
    label: "Signatory 1 — position",
    suppressesLayer: "08-position-1.svg",
    anchor: { x: 848, y: 1952 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 54,
    maxWidth: 950,
    maxLength: 45,
    defaultColor: "#000000",
    defaultText: "",
  },
  {
    id: "license-back-signatory-2",
    artifact: "license-back",
    label: "Signatory 2 — name",
    suppressesLayer: "13-signatory-2.svg",
    anchor: { x: 2605, y: 1872 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 71,
    fontWeight: "bold",
    maxWidth: 950,
    maxLength: 45,
    defaultColor: "#000000",
    defaultText: "",
  },
  {
    id: "license-back-position-2",
    artifact: "license-back",
    label: "Signatory 2 — position",
    suppressesLayer: "12-position-2.svg",
    anchor: { x: 2604, y: 1951 },
    align: "middle",
    fontFamily: SANS,
    fontSize: 55,
    maxWidth: 950,
    maxLength: 45,
    defaultColor: "#000000",
    defaultText: "",
  },
];

/** Default fill colors of the always-dynamic overlays. */
export const OVERLAY_COLOR_DEFAULTS: Record<OverlayColorKey, string> = {
  "cert-name": "#1a1a1a",
  "cert-body": "#1a1a1a",
  "cert-lcn": "#1a1a1a",
  "license-name": "#000000",
  "license-lcn": "#000000",
  "license-dates": "#000000",
};

export const OVERLAY_COLOR_LABELS: Record<OverlayColorKey, string> = {
  "cert-name": "Certificate — graduate name",
  "cert-body": "Certificate — award body text",
  "cert-lcn": "Certificate — license number",
  "license-name": "ID card — holder name",
  "license-lcn": "ID card — license number",
  "license-dates": "ID card — issue/validity dates",
};
