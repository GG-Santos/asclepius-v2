# Asclepius — Image Generation Prompts (Gemini agent)

A copy-paste prompt pack for a Gemini image-generation agent to produce every
image the Asclepius site needs. The visual language follows `DESIGN.md`
(Clinical Response System): **Deep Navy `#001a48`**, **Emergency Red `#ba002a`**
used sparingly, **Clinical Blue `#3d5ca2`** for accents, cool clinical grays,
clean and authoritative, never playful.

## Global style block (prepend to every prompt)

> Style: modern clinical / institutional healthcare. Deep navy and cool gray
> palette with restrained clinical-blue accents; emergency red only for a single
> focal alert element when relevant. Clean, high-trust, government-grade.
> Soft, even studio lighting. No text, no watermarks, no logos, no lens flare,
> no heavy vignette. Photoreal unless stated otherwise. Composition leaves calm
> negative space for overlaid UI.

## Delivery rules for the agent

- Save into `asclepius/public/assets/img/generated/` using the **filename** given per item.
- Honor the exact **aspect ratio** and **resolution**; export optimized WebP plus a PNG fallback.
- Do not render any readable text inside the image — UI text is overlaid by the app.
- Keep file sizes < 400 KB where possible (hero may go to 800 KB).

---

## 1. Homepage hero background — `hero-ems.webp`
- **Aspect / size:** 16:9, 2400×1350.
- **Prompt:** "A composed, slightly low-angle wide shot of two professional Emergency Medical Technicians in clean navy uniforms beside a modern ambulance at a calm station bay, early-morning soft light, shallow depth of field, deep-navy and cool-gray tones, ample empty sky/wall space on the left for headline overlay. Reassuring and authoritative, not dramatic."

## 2. Hero abstract fallback — `hero-pattern.webp`
- **Aspect / size:** 16:9, 2400×1350.
- **Prompt:** "Minimal abstract medical-tech background: subtle navy gradient with a faint geometric grid and a single softly glowing clinical-blue star-of-life motif off-center, lots of negative space, premium and restrained, no text."

## 3. 'About / trust' section image — `about-team.webp`
- **Aspect / size:** 4:3, 1600×1200.
- **Prompt:** "A small group of EMT trainees and an instructor reviewing equipment in a bright clinical training room, focused and professional, navy uniforms, neutral background, candid documentary feel, soft daylight."

## 4. Verification illustration — `verify-shield.webp`
- **Aspect / size:** 1:1, 1200×1200.
- **Prompt:** "A clean 3D-render icon of a shield merged with a medical star-of-life and a subtle checkmark, deep navy with a clinical-blue rim light, floating on a near-white clinical background with a soft contact shadow, product-render quality, no text."

## 5. Blog default cover — `blog-cover-default.webp`
- **Aspect / size:** 16:9, 1600×900.
- **Prompt:** "Editorial abstract for an emergency-medicine knowledge article: navy and gray layered paper-cut shapes suggesting a pulse line and a cross, calm and modern, generous margins, no text."

## 6. Empty-state illustration — `empty-records.webp`
- **Aspect / size:** 1:1, 1000×1000.
- **Prompt:** "A simple friendly line-and-flat illustration of an empty clipboard/registry with a small star-of-life badge, navy and clinical-blue on white, lots of whitespace, gentle, no text."

## 7. Open Graph card — `og-default.png`
- **Aspect / size:** 1.91:1, 1200×630.
- **Prompt:** "Social share card background: deep navy field with a faint geometric grid, a single clinical-blue star-of-life mark in the lower-left third, smooth gradient, large clear empty area centered-right for overlaid title text (leave it blank). No text in the image."

## 8. Favicon / app mark — `icon-mark.png`
- **Aspect / size:** 1:1, 512×512, transparent background.
- **Prompt:** "A minimal flat app icon: a stylized star-of-life unified with the letter A negative space, single deep-navy color on transparent background, crisp geometric, scalable, no gradient, no text."

## 9. Login side panel — `login-aside.webp`
- **Aspect / size:** 3:4 portrait, 1200×1600.
- **Prompt:** "Vertical hero for a staff sign-in screen: a calm close-up of an ambulance's blue light bar and clean bodywork at dusk, deep navy mood, soft bokeh, premium and quiet, left/top space for a logo overlay, no text."

---

## Notes for integration
- Hero/login images plug into `src/app/page.tsx` and `src/app/login/page.tsx`.
- `og-default.png` → wire via `opengraph-image` metadata; `icon-mark.png` → `app/icon.png`.
- Generated assets are static `/public` files (Turbopack-friendly; no loader needed).
- After generation, run `npx next build` to confirm `next/image` accepts them
  (local images need no remotePatterns entry).
