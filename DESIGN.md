# DESIGN.md — Vital Signs

The WSL EMS design system. Instrument-grade med-tech: the precision of a
monitoring instrument applied to a credentialing institution. The dashboard IS
the brand. Token authority: `src/app/globals.css` (mirrors
`wabblespec/state/design-ledger.json`).

## Identity

- **Seeds:** premium institutional trust × modern med-tech.
- **Signature:** the EKG pulse-line (`.ekg-divider`), visible focus rings, and
  monospace tabular numerals on every metric, ID, and timestamp.
- **Name & mark:** WSL EMS and the star-of-life icon are retained, recolored.

## Color

One brand hue. Status colors are semantics, never decoration.

| Role | Light | Dark |
|---|---|---|
| Background / canvas | `#fafafa` zinc | `#0b0b0c` near-black |
| Card | `#ffffff` | `#111113` |
| Sidebar (basement) | `#f4f4f5` | `#060607` |
| Ink / primary action | `#18181b` | `#f4f4f5` (inverted) |
| Accent — Pulse Teal | `#0f766e` (AA text) / `#0d9488` bright | `#2dd4bf` / `#5eead4` |
| Success / Warning / Error | `#15803d` / `#b45309` / `#b91c1c` | `#4ade80` / `#fbbf24` / `#f87171` |

Rules:
- Text accent uses `--color-accent` only (AA-attested ≥ 4.5:1 on bg/card in both modes).
- `--color-accent-bright` is decorative (icons, glows, EKG) — never body text on light.
- Status is never conveyed by color alone: chip = icon + label.
- Chart series (`--color-chart-1..6`) are functional data hues, teal-led.

## Typography

- **Geist Sans** — everything. Hierarchy by weight + size, not font changes.
- **Geist Mono** — every number, LCN, ID, timestamp, code. Always
  `tabular-nums` (`.tabular` or `.text-data-mono`).
- Scale utilities: `.text-display-lg`, `.text-headline-lg`, `.text-title-md`,
  `.text-label-caps` (tracked uppercase microlabels), `.text-data-mono`.

## Shape & elevation

- Radii: 6px default (`rounded`), 4px small, pills ONLY for status chips.
- **Borders over shadows.** Hairline 1px (`border-outline-variant`,
  `dark:border-white/[0.05..0.1]`) carries structure. Shadows are reserved for
  floating layers (dialog, popover, dropdown) and stay small.
- Surfaces separate by luminance steps (`surface-low → container → high → highest`).

## Motion

- Micro-interactions only: 120–180ms, default easing. No easing theatrics.
- The animated EKG sweep is the one permitted flourish (dividers, loading).
- Pre-approved library: `motion` — use sparingly, prefer CSS.

## Focus & accessibility

- `focus-visible` ring (2px `--color-accent`, offset) on EVERY interactive
  element — it is the signature flourish, never remove it.
- WCAG 2.1 AA floor: text pairs from the attested token pairs only.
- Loading states per data zone (skeletons); designed empty states — sections
  never vanish.

## Anti-patterns (banned)

Serifs · warm tints · decorative illustration · big soft shadows · a second
accent hue · purple/AI gradients · neon · pill-everything · stock-photo
medical clichés · color-only status.

## Functional exemptions (invariant in both modes)

- Print artifacts: `verify/certificate.tsx`, `verify/license-card.tsx`,
  `portal/ce-certificate.tsx` SVG fills reproduce physical masters.
- QR backings stay `bg-white` (scanner contrast).
- Photo-crop scrims use neutral black overlays.
