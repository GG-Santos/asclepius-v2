# Homepage Redesign Blueprint

**Project:** WSL EMS Safety & Rescue Training Center — public homepage (`src/app/page.tsx`)
**Internal app codename:** Asclepius (must NOT appear in public-facing copy or metadata)
**Source of truth:** the prior brutal critique + `DESIGN.md` ("Clinical Response System") + the real Prisma data model.
**Stack:** Next.js (App Router, breaking-changed — read `node_modules/next/dist/docs/` before coding), Tailwind v4 `@theme` tokens, Prisma/MongoDB, lucide-react, next/image.

---

## Redesign Goal

Stop building a dark SaaS landing page and build the thing this business actually is: **the official public registry of EMTs trained and certified at WSL EMS, fronted by a verification tool a hospital HR officer or a regulator can trust in five seconds.** The redesign reverses the current homepage's core mistake — it abandoned its own design system (`DESIGN.md`: light, clinical, deep-navy authority, "avoid glassmorphism") in favor of a dark, glass-card, glow-on-everything template that reads generic and undercuts trust. We return to and elevate the institutional clinical aesthetic, make the verification tool the spine of the page, give the training audience a real (clearly-separated) conversion lane with an actual "apply" path, and replace every fabricated element (fake testimonials, gradient "photos," tautology stats) with proof pulled from real database tables — gated to show only when real data exists. The result should feel less like a startup pitch and more like a government licensing portal that happens to have excellent visual design.

## New Brand Feel

| | |
|---|---|
| **One-line feel** | "A passport-control desk for medical credentials — calm, exact, official." |
| **Personality** | Authoritative, reliable, meticulous, clinical. Trust through restraint, not hype. |
| **First 3 seconds must say** | *This is the official place to check whether an EMT is real — and it's free and instant.* |
| **Emotional target** | Verifier: relief + confidence. Prospective student: "these people are serious; I want their credential." |
| **Anti-feel** | Crypto/AI-landing-page. No neon glow, no gradient hero text, no glass, no "future of emergency care." |

### First-3-seconds answers (the hero must resolve all four instantly)
- **What is this?** The official registry to verify a WSL EMS-trained EMT's license.
- **Who is it for?** Employers, agencies, regulators, and the public verifying a responder — and Filipinos who want EMS training.
- **Why care?** Lives depend on whether the person treating you (or whom you're hiring) is actually qualified.
- **What next?** Verify a license (primary). Or: train to become an EMT (secondary).

### Remove from the old design (non-negotiable)
- The entire all-dark palette (`#050c17 / #070e1c / #0a1628`) and the per-section dot-grid + radial-glow preset (repeated 4×).
- All glassmorphism (`backdrop-blur`, `bg-white/[0.0x]` glass cards) — **explicitly forbidden by `DESIGN.md`.**
- Gradient-clipped hero text.
- Fabricated `ReviewCard` testimonials labeled "authentic / verified."
- The gradient-rectangle gallery labeled "Photos curated by…".
- Duplicate program listing (Announcements **and** Services both list BLS/EMR/EMT).
- Filler stats "24 / 7" and "100%".
- "Most Popular" / "Core Program" pricing-tier badges.
- The decorative `Sparkles` icon for "Specialized Courses."
- "Asclepius" in `<title>` / OG (use **WSL EMS**).

### Keep (only because genuinely useful)
- The working `VerifySearch` component — it is the product's core action. Restyle, don't remove.
- The hand-built Star-of-Life + staff-of-Asclepius SVG mark — promote it into a proper wordmark lockup.
- Hanken Grotesk + JetBrains Mono pairing (mandated by `DESIGN.md`; mono is for LCN/dates only).
- Real `licensed` (Graduate count) and `batches` (Batch count) figures — reframed with `LookupEvent` volume.
- Real assets already on disk: `hero-ems.webp`, `verify-shield.webp`, `hero-pattern.webp`, `about-team.webp`, and the License/Certificate SVG templates.
- The Blog section (real `BlogPost` data) — gated on `count > 0`.

---

## New Homepage Flow

Two audiences, one page, **no interleaving.** Verification is the spine; training is a clearly-signposted lane that branches and rejoins. Section order:

| # | Section | Purpose | Critique problem it fixes |
|---|---|---|---|
| 0 | **Sticky header** | Brand + nav + persistent "Verify" CTA; reveals a mini-verify field on scroll | No repeated CTA; weak brand lockup |
| 1 | **Hero — verification-first** | Answer the 4 questions; put the live search *in* the hero; show the real result card | Audience confusion; generic dark hero; unused real art |
| 2 | **Live registry proof bar** | Real numbers (licensed, cohorts, checks run, years) | Filler "24/7 / 100%" stats; no real proof |
| 3 | **What WSL EMS is (trust explainer)** | Disambiguate training-center vs official-registry; explain ASHI | "Official registry vs private school" credibility gap |
| 4 | **How verification works (+ try-a-sample)** | 3 steps tied to the real flow; de-risk for skeptics; show status honesty | CTA loop; skeptic handling absent |
| 5 | **Programs (single, merged)** | One programs block with real specs + a real Apply CTA | Duplicate program sections; dead-end "contact admin" |
| 6 | **Why train with WSL (outcomes/proof)** | Accreditation, instructors, cohort proof, pass-rate | No proof for the training pitch |
| 7 | **Graduate outcomes / voices (real or cut)** | Real `Testimonial` model OR batch wall; never fake | Fabricated testimonials |
| 8 | **News / Blog** | Real published posts | (keep, gated) |
| 9 | **Final CTA — dual** | Explicit split: Verify a credential / Apply for training | Single looping CTA; students get nothing |
| 10 | **Institutional footer** | Brand, address, contact, accreditation, legal, registry info | No contact, no legal, no address |

---

## Hero Section Redesign

**Strategy:** the hero is not a banner — it *is the verification tool*. Left column carries the message and the live search; right column shows the payoff (a real, slightly-redacted verification result card with a green "Verified" chip). Light background, deep-navy panel behind the visual. This answers all four first-3-second questions and lets a verifier complete the primary action without scrolling.

```
┌─────────────────────────────────────────────────────────────┐
│  [eyebrow] OFFICIAL EMT CREDENTIAL REGISTRY · WSL EMS         │
│                                          ┌──────────────────┐ │
│  Verify an EMT's license                 │  ✦ VERIFIED      │ │
│  in seconds.                             │  Juan D. Cruz    │ │
│                                          │  LCN A09-240801  │ │
│  The official registry of EMTs trained   │  EMT · Batch 19  │ │
│  and certified at WSL EMS. Free,         │  Issued 2024-08  │ │
│  instant, no account required.           │  Status: Active  │ │
│                                          └──────────────────┘ │
│  ┌───────────────────────────┐ ┌────────────┐                 │
│  │ Enter license number…     │ │ Verify ▸   │   (navy)        │
│  └───────────────────────────┘ └────────────┘                 │
│  Real-time check · No login · Try a sample ›                  │
│                                                               │
│  ASHI-accredited · 1,240 licensed · 38,902 checks run         │
│  ── Looking to train as an EMT? Explore programs → ──          │
└─────────────────────────────────────────────────────────────┘
```

| Element | Decision |
|---|---|
| **Eyebrow** | `OFFICIAL EMT CREDENTIAL REGISTRY · WSL EMS` (label-caps, navy/clinical-blue) |
| **Headline** | **"Verify an EMT's license in seconds."** |
| **Subheadline** | "The official registry of Emergency Medical Technicians trained and certified at WSL EMS. Free, instant, and open to anyone — no account required." |
| **Primary action** | The inline `VerifySearch` (LCN input + navy **"Verify license"** button). The hero IS the CTA. |
| **Trust microcopy** | "Real-time check against {liveCount} active credentials · No login required · **Try a sample ›**" (sample fills the field with a demo LCN and runs it) |
| **Secondary CTA** | "Looking to train as an EMT? **Explore programs →**" (anchors to Programs / `/programs`) |
| **Trust row** | `ASHI-accredited · {licensed} licensed technicians · {lookups} verifications run` (all real) |
| **Visual concept** | A real verification result card (reuse `verify/license-card.tsx` render) with a green Verified chip, on a navy panel; optional `hero-pattern.webp` texture at low opacity. |
| **Motion** | On submit: subtle "stamp → Verified" micro-animation on the card. Hero content: one 300ms rise-in. Respect `prefers-reduced-motion`. No pulsing glow. |
| **Layout** | 12-col: content cols 1–7, visual cols 8–12 desktop. Stacks on mobile (headline → search → trust; visual simplified to a single Verified chip or hidden). |

---

## Visual Design System

All values come from `DESIGN.md` / `globals.css` `@theme`. **Rule #1: use the tokens. No hardcoded hexes in `page.tsx`** (the current page's cardinal sin).

### Color
| Role | Token | Hex | Usage |
|---|---|---|---|
| Background | `--color-background` | `#f7f9fb` | Page base — **light, not dark** |
| Card | `--color-card` | `#ffffff` | Cards, panels |
| Surface layer | `--color-surface-container` | `#eceef0` | Alternating section bands (tonal, subtle) |
| Authority | `--color-primary` | `#001a48` | Header, primary buttons, headings, hero visual panel |
| Interaction / Verified | `--color-accent` / `-bright` | `#3d5ca2` / `#489df1` | Links, focus, "Verified" iconography |
| Critical ONLY | `--color-secondary` | `#ba002a` | "Expired/Revoked" status, never decoration |
| Verified status | `--color-success` | `#1f7a4d` | Verified chip |
| Text | `--color-on-surface` / `-variant` | `#191c1e` / `#444651` | Body / secondary text (passes AA on light) |

**Accent discipline:** one interaction color (clinical blue). Kill the current rose/teal/amber/indigo/blue per-card rainbow. Programs differentiate by label + icon, not by five hues.

### Typography
- **Hanken Grotesk** everywhere; **JetBrains Mono** for LCN, dates, IDs, certificate numbers only.
- Scale (from `DESIGN.md`, fluid via `clamp()`): display-lg 48/56/-0.02em (hero, clamp 32→48 mobile→desktop) · headline-lg 32/40 · title-md 18/24 · body-md 16/24 · body-sm 14/20 · label-caps 12/16/0.05em · data-mono 13/18.
- Public pages use generous leading; never set body below 16px.

### Spacing & Grid
- 4px base. Rhythm: 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.
- Section vertical padding: **96px desktop / 64px tablet / 56px mobile.**
- Grid: **12-col desktop** (24px gutter, 48px margins, container max 1200, hard max 1440) · 8-col tablet (16px gutter, 32px margins) · 4-col mobile (12px gutter, 16px margins).

### Cards
White `#fff`, **1px border** `--color-outline-variant` `#c4c6d2`, radius 12px (small) / 16px (large containers), `shadow-clinical` (`0 4px 12px rgba(0,26,72,.04)`). Hover: border → clinical blue + `shadow-clinical-md`. **No backdrop-blur. No glass.**

### Buttons (existing `button.tsx` already correct)
Primary = navy, hover → clinical blue, 48px, radius 8px. Secondary = `outline`. Reserve the red `secondary` variant strictly for destructive/critical. Don't introduce new button styles.

### Icons / Illustration
- lucide icons **only where they carry meaning** (status, steps, contact). Remove decorative ones.
- The Star-of-Life mark is the brand motif (header lockup, watermark, favicon).
- Status chips per `DESIGN.md`: pill shape, 10% tint — Verified (blue/green), Expired (red), Pending (orange). Always icon + text (never color-only).

### Imagery / Video
- **Real photography** for training/cohorts (replace gradient gallery). Documentary tone — real responders, real equipment. No stock-smile energy.
- **Credential renders** (License/Certificate SVGs) as product visuals — the registry's "product" is the credential record; show it.
- Use `hero-ems.webp`, `verify-shield.webp`. Optional navy duotone for cohesion.
- No video required; if used, a muted 6–10s training-floor loop in the "Why train" band only.

### Background treatment
Light surfaces with **tonal layering** (alternate `--color-background` ↔ `--color-surface-container`) to create chapters. The ONLY rich-color moments: the navy panel behind the hero visual and the navy Final-CTA band. No per-section glow, no dot-grid wallpaper.

### Motion rules
Purposeful only: scroll-reveal (8–16px rise, 300–500ms, once via IntersectionObserver — reuse `FadeIn`), count-up on the stat bar, verified-stamp on result. Everything respects `prefers-reduced-motion`. Banned: infinite pulsing, parallax-for-its-own-sake, glow breathing, motion without communicative purpose.

---

## Section-by-Section Redesign

### 1. Hero (verification-first)
- **Purpose:** answer the 4 questions; let a verifier complete the primary action immediately.
- **Fixes:** audience confusion, generic dark hero, unused real art.
- **Layout:** 12-col split (content 1–7 / result-card 8–12); navy panel behind visual; light page.
- **Content:** eyebrow, H1, subhead, inline search, trust microcopy + "Try a sample", trust row, secondary "Explore programs".
- **Visual:** real Verified result card; `hero-pattern.webp` at ≤8% opacity.
- **Motion:** one rise-in; stamp-on-verify; reduced-motion safe.
- **CTA:** the search (primary) + "Explore programs →" (secondary).
- **Impl:** server component fetches `liveCount`; search stays `"use client"`; result card is static sample data (clearly a sample), not a real person.

### 2. Live registry proof bar
- **Purpose:** prove the registry is real and active.
- **Fixes:** filler stats; no real proof.
- **Layout:** 4 cells, 12-col, `divide-x` on a `--color-surface-container` band.
- **Content (REAL):** `{licensed}` Licensed technicians · `{batches}` Cohorts trained · `{lookups}` Credential checks run (`LookupEvent.count`) · `{years}+` Years training responders (or "Since {founded}").
- **Visual:** navy numerals (JetBrains Mono tabular), gray labels, hairline dividers.
- **Motion:** count-up on first view.
- **CTA:** none (proof, not action).
- **Impl:** cache the `LookupEvent` aggregate ~60s (don't recount on every request). If a metric is genuinely unknown, omit the cell — never fabricate.

### 3. What WSL EMS is (trust explainer)
- **Purpose:** disambiguate "training center" vs "official registry"; explain ASHI; establish authority honestly.
- **Fixes:** the overclaim/credibility gap flagged in the critique.
- **Layout:** editorial split — `about-team.webp` left, precise copy + accreditation marks right (or reverse on alt rows).
- **Content:** "WSL EMS is a safety and rescue training center. This registry is the public record of every EMT we've trained and certified — so employers, agencies, and patients can confirm a responder is the real thing." + a 3-step pipeline diagram: **Train → Evaluate → License → Public registry.**
- **Visual:** real photo; ASHI accreditation mark (asset placeholder if not yet supplied); a clean SVG pipeline diagram (institutional, not decorative).
- **Motion:** reveal on scroll.
- **CTA:** inline link "How we evaluate every graduate →" (to /about or anchor).

### 4. How verification works (+ try-a-sample)
- **Purpose:** reassure skeptical verifiers; show the registry tells the truth about expiry.
- **Fixes:** skeptic handling; CTA loop.
- **Layout:** 3 numbered steps + a **status triad** (Verified / Expired / Not found) showing all three real outcomes.
- **Content:** Step 1 Find the LCN · Step 2 Search the live registry · Step 3 Confirm name, photo, status, dates. Triad caption: "If a license is expired or revoked, we show that too. The registry tells the truth, not the sales pitch."
- **Visual:** three mini result-card states (green/red/gray chips).
- **Motion:** staggered reveal.
- **CTA:** "Verify a license ›" scrolls to hero search (or focuses the sticky mini-search).

### 5. Programs (single, merged)
- **Purpose:** one authoritative programs block with a real Apply path.
- **Fixes:** duplicate program sections; dead-end "contact admin."
- **Layout:** 4 cards (BLS / EMR / EMT / Specialized), equal-weight, no "Most Popular" badge.
- **Content per card:** credential, hours, outcome, one honest line; **"Apply / Request info →"** to `/enroll`. Replace all three "Registration open — dates TBA" with a real next-cohort line or "Rolling intake — request a schedule."
- **Visual:** white cards, 1px border, one navy icon each (meaningful), mono for "hours."
- **Motion:** subtle hover lift (2px) + border→blue.
- **CTA:** every card → `/enroll`; section-level "See all programs →".
- **Impl:** programs can be static config now; promote to a `Program` model later. The Apply CTA must hit a **real lead-capture** (see Conversion).

### 6. Why train with WSL (outcomes/proof)
- **Purpose:** convert the prospective student with proof, not adjectives.
- **Fixes:** "World-class / Excellence" emptiness; no proof.
- **Layout:** 3–4 proof tiles + accreditation row.
- **Content:** ASHI accreditation, instructor credibility (real names/credentials — `TeamMember` placeholder), cohort proof (batch wall), pass-rate (real metric placeholder, clearly labeled until wired).
- **Visual:** accreditation marks, real instructor photos, batch-logo mosaic.
- **CTA:** "Apply for the next cohort →".

### 7. Graduate outcomes / voices (REAL or cut)
- **Purpose:** social proof — only if it can be true.
- **Fixes:** fabricated testimonials.
- **Decision:** add a real `Testimonial` model (admin-approved, tied to a real Graduate LCN) and render only when `count > 0`. **If empty, render the batch wall / "where our graduates serve" institutional proof instead.** Never hardcode names.
- **Layout:** 3 quote cards or a logo wall.
- **Visual:** real graduate photo (with consent) or initials; mono LCN/batch tag.
- **CTA:** none, or "Read graduate stories →".

### 8. News / Blog
- **Purpose:** show an active institution.
- **Layout:** 3 latest `PUBLISHED` posts, gated on `posts.length > 0`.
- **Visual:** white cards, `coverImage` or `blog-cover-default.webp`, mono date.
- **CTA:** "All updates →" `/blog`.

### 9. Final CTA — dual
- **Purpose:** resolve both audiences explicitly.
- **Fixes:** single looping CTA; students stranded.
- **Layout:** navy band, centered, two buttons.
- **Content:** H2 "Confirm a credential — or start your own." Primary **"Verify a license"** (white-on-navy) · Secondary **"Apply for training"** (outline) → `/enroll`.
- **Visual:** navy `--color-primary` band, Star-of-Life watermark.
- **Motion:** reveal.

### 10. Institutional footer
- **Purpose:** trust + legal + contact (table stakes, currently missing).
- **Content:** brand lockup + "We Save Lives"; physical address; phone; email; ASHI/registration marks + numbers; nav (Verify, Programs, About, News, Help); legal (Privacy, Terms, Cookie prefs — `ConsentBanner` exists); "Staff sign in"; © year.
- **Visual:** navy or deep surface, organized columns.

---

## Copywriting Rewrite

| Slot | Old (weak) | New |
|---|---|---|
| Hero eyebrow | "WSL EMS · Official EMS Credential Registry" | "Official EMT Credential Registry · WSL EMS" |
| Hero H1 | "Verify any EMT credential" (gradient) | **"Verify an EMT's license in seconds."** |
| Hero subhead | "The official registry of Emergency Medical Technicians trained, certified, and licensed under WSL." | "The official registry of Emergency Medical Technicians trained and certified at WSL EMS. Free, instant, and open to anyone — no account required." |
| Search microcopy | "Real-time check · Free · No login required" | "Real-time check against {N} active credentials · No login · **Try a sample ›**" |
| Secondary CTA | (none) | "Looking to train as an EMT? **Explore programs →**" |
| Stat — filler | "24 / 7 — Online verification" | "{lookups} — Credential checks run" |
| Stat — filler | "100% — Registry-backed records" | "{years}+ — Years training responders" |
| Programs H2 | "World-class training, nationally recognized" | "ASHI-accredited EMS training, built for real emergencies." |
| Programs sub | "Every WSL EMS program is certified by ASHI and meets national emergency standards." | "Every program is ASHI-accredited and evaluated by written exam, practical skills, and supervised clinical hours." |
| Program schedule | "Registration open — dates TBA" (×3) | "Next cohort: {Month YYYY} · {N} seats" or "Rolling intake — request a schedule" |
| How-it-works H2 | "Trusted verification in three steps" | "Confirm a credential in three steps." |
| Status honesty | (none) | "If a license is expired or revoked, we show that too. The registry tells the truth, not the sales pitch." |
| Gallery H2 | "Training in action" (fake tiles) | "Inside the training floor." (real photos, or cut) |
| About H2 | "Excellence in Emergency Care Education" | "We train the EMTs your emergency depends on." |
| Reviews H2 | "Stories from our graduates" (fake) | "Where our graduates serve." (real, or batch wall) |
| Reviews footer | "Authentic reviews from verified graduates" | (only if real) "Submitted by verified WSL EMS graduates." |
| Final H2 | "Need to confirm a responder's credential?" | "Confirm a credential — or start your own." |
| Final CTAs | "Verify a license" (only) | "Verify a license" + "Apply for training" |

**Benefit lines (use sparingly, where they earn their place):**
- "Every name in this registry passed a written exam, a practical skills evaluation, and supervised clinical training."
- "One license number is all you need. No account, no fee, no wait."
- "Built for the people who can't afford to guess — HR officers, agency dispatchers, and patients."

**Banned words:** empowering, seamless, innovative, revolutionary, world-class (unless backed by a named accreditation), cutting-edge, "future of X," game-changing, elevate, unlock.

---

## Trust and Proof Strategy

Every proof element maps to a **real data source** and renders only when real data exists. Where a source doesn't exist yet, ship an admin-fillable empty state — never fabricate.

| Proof element | Real source | If empty |
|---|---|---|
| Licensed technicians | `Graduate.count({status: GRADUATE})` | Show "—", or omit cell |
| Cohorts trained | `Batch.count()` | Omit |
| Credential checks run | `LookupEvent.count()` (+ this-month, found-rate) | Omit — but this should be non-zero |
| Years active / Since {year} | config / earliest Batch.year | Omit |
| Accreditation | ASHI mark asset + registration number in footer | Placeholder mark, admin replaces |
| Process pipeline | static diagram (Train→Evaluate→License→Registry) | n/a (always true) |
| Instructors | **new** `TeamMember` model (name, role, credentials, photo) | Hide section |
| Batch wall | `Batch.logo` (`MediaAsset`) | Hide |
| Testimonials | **new** `Testimonial` model (graduateLcn, quote, approved) | Hide; show batch wall instead |
| Training photos | `MediaAsset` (admin-uploaded) | Hide gallery (don't fake) |
| Sample verification | static demo LCN → real `/verify` flow | n/a |
| FAQ | static content | n/a |

**FAQ (new section or footer accordion):**
1. What is a License/Control Number (LCN)? 2. Is verification really free? 3. What does "ASHI-accredited" mean? 4. A license shows "Expired" — what does that mean? 5. I'm an employer verifying a hire — what can I rely on? 6. How do I enroll in a program? 7. What information is public vs. private?

**Security/privacy note:** one line near the search — "Public verification shows credential status, name, and certification dates only. No contact details are exposed." Ties to the existing `ConsentBanner`/GDPR work.

---

## Conversion Strategy

| | |
|---|---|
| **Primary goal** | Completed verification (LCN → result). Measured via `LookupEvent`. |
| **Secondary goal** | Training lead (Apply / Request info → captured contact). |
| **Tertiary** | Staff sign-in (footer/nav only). |
| **CTA hierarchy** | Verify (navy primary; hero + sticky + how-it-works + final) > Apply (outline; programs + why-train + final) > Staff sign-in (ghost; footer). |
| **Repeated placements** | Hero search · sticky mini-search on scroll · How-it-works · Final dual band. |
| **Friction removed** | No login for verify (keep) · "Try a sample" demo · auto-uppercase + format LCN · instant validation · explicit Verified/Expired/Not-found states. |
| **Skeptic handling** | Trust explainer (who we are + ASHI) · status-honesty triad (we show expired) · live counts · sample demo · FAQ. |
| **What a visitor needs before acting** | (a) confidence it's official → accreditation + registry framing; (b) proof it works → sample result; (c) zero cost/friction → free, no login. |

**The missing conversion path (critical build):** a real `/enroll` route with a lead-capture form (name, contact, program interest, message) writing to a new `Inquiry`/`Lead` model or sending an email via a server action. The current "contact admin to register" with no contact mechanism is the single biggest business failure and must ship in v1.

---

## Component Plan

`src/components/home/*` for sections; reuse `ui/*`; server components by default, client only where interactive.

| Component | Role | Data / props | Responsive | States | A11y |
|---|---|---|---|---|---|
| `SiteHeader` | Brand + nav + persistent Verify; reveals mini-search on scroll | `session`, `verifyHref` | Hamburger < md; Verify always visible | default / scrolled / signed-in | `<header>`, skip-link, focus-visible |
| `Hero` | Message + live search + result visual | `liveCount` | Split → stacked | — | `<h1>`, labeled search |
| `VerifySearch` (enhance) | Core action | `onSubmit`, demo LCN | full-width mobile | idle / typing / invalid | `aria-label`, error text |
| `ResultCardPreview` | Show the payoff (sample) | static sample | scales/hides on mobile | Verified/Expired/NotFound | `role="img"` + alt, not color-only |
| `StatBar` + `StatCounter` | Live proof | `{licensed,batches,lookups,years}` | 4→2×2 | loading / count-up / reduced-motion static | numbers labeled, `aria-live` off |
| `TrustExplainer` | Disambiguate + pipeline diagram | copy, image, marks | split → stacked | — | alt text, semantic diagram |
| `StepList` | How it works | steps[] | 3→1 col | reveal | ordered list |
| `StatusTriad` | Verified/Expired/NotFound | static | 3→1 | — | icon+text chips |
| `ProgramCard` / `ProgramGrid` | Merged programs + Apply | program[] | 4→2→1 | hover | links, `<h3>` |
| `EnrollCTA` / `LeadForm` | Capture training leads | server action | full-width mobile | idle / submitting / success / error | labeled fields, error summary |
| `ProofBand` / `AccreditationRow` | Marks + instructors | TeamMember[] | wrap | hide if empty | alt on logos |
| `BatchWall` | Cohort logo mosaic | Batch.logo[] | grid reflow | hide if empty | alt per logo |
| `TestimonialCard` | Real quotes (gated) | Testimonial[] | 3→1 | hide if empty | `<blockquote>` + cite |
| `FAQAccordion` | Objection handling | qa[] | full-width | expanded/collapsed | `button[aria-expanded]`, keyboard |
| `NewsGrid` / `NewsCard` | Blog | posts[] | 3→1 | hide if empty | `<article>`, `<time>` |
| `FinalCTA` | Dual conversion | hrefs | stack buttons | — | contrast AA on navy |
| `SiteFooter` | Institutional footer | links, contact | columns → stack | — | `<footer>`, nav landmark |

---

## Responsive Plan

| Breakpoint | Grid / margins | Hero | Nav | Stats | Grids | Notes |
|---|---|---|---|---|---|---|
| **Desktop ≥1280** | 12-col, 48px margins, max 1200–1440 | Split (content + result card) | Full nav + Verify CTA | 4 across | 4-col programs | Side-by-side editorial splits |
| **Laptop 1024–1280** | 12-col, 32–40px margins, ~1120 | Split, tighter | Full nav | 4 across | 4-col | — |
| **Tablet 768–1024** | 8-col, 32px margins | Stacked (content over visual) | Secondary items collapse; Verify persists | 2×2 | 2-col | Splits stack image-over-text |
| **Mobile <768** | 4-col, 16px margins | Headline → search → trust; visual = single Verified chip or hidden | Hamburger + **sticky bottom Verify bar** | 2×2 | 1-col | Section order unchanged; FAQ accordion; tap targets ≥44px |

Mobile specifics: never reshuffle section order; LCN input full-width with the button below; sticky bottom "Verify" bar after hero scrolls out; programs collapse to single column with the Apply CTA always visible per card.

---

## Frontend Build Plan

1. **Read first:** `node_modules/next/dist/docs/` (this Next.js is breaking-changed) before writing routes/components.
2. **Page structure:** `page.tsx` stays a server component; one `getLandingData()` `Promise.all` fetches: graduate count, batch count + logos, `LookupEvent` aggregate (cached ~60s), published posts, testimonials (if model added). Pass plain data into presentational section components.
3. **File org:** create `src/components/home/{hero,stat-bar,trust-explainer,step-list,status-triad,program-grid,enroll-cta,proof-band,batch-wall,testimonials,news-grid,final-cta}.tsx`; `site-header.tsx` / `site-footer.tsx` replace/extend `public-header.tsx`. Keep `VerifySearch` and any scroll-reactive header client-side.
4. **Styling:** Tailwind v4 `@theme` tokens ONLY — delete the inline `HERO_BG/DARK_ALT/DARK_CARD` hexes; add a `--color-verified` semantic token if needed. Switch the page to the **light** surface tokens.
5. **Animation:** reuse the existing `FadeIn` (IntersectionObserver) + a small `useCountUp` hook. Add Framer Motion only if the verified-stamp needs it — justify before adding a dependency. All motion behind `prefers-reduced-motion`.
6. **Images:** `next/image`, AVIF/WebP, explicit `sizes`, `priority` on hero only, lazy elsewhere. Use real assets; render License SVG for the result card. Replace gradient gallery with real `MediaAsset` photos (gated).
7. **A11y (WCAG 2.1 AA):** the light theme fixes the contrast failures by construction; keep `focus-visible` rings; semantic landmarks; labeled search; keyboard-operable FAQ accordion; status as icon+text; alt on all imagery.
8. **Performance:** server components, minimal client JS, defer below-fold, cache the stat aggregate (don't recount `LookupEvent` per request); keep hero LCP image optimized + `priority`.
9. **SEO:** set `<title>`/OG to **WSL EMS** (retire "Asclepius" publicly); real description; `og-default.png` (exists); add JSON-LD `EducationalOrganization` + `MedicalBusiness`; canonical; `sitemap.ts` + `robots.ts`.
10. **Data/new models:** `Testimonial { graduateLcn, quote, role, approved, createdAt }`, `TeamMember { name, role, credentials, photoId, order }`, `Inquiry { name, contact, program, message, createdAt }` for `/enroll`. All admin-managed; homepage gates on existence.

---

## Anti-Slop Checklist

The final homepage must pass every line:

- [ ] **No vague copy.** Every headline names a concrete who/what/outcome.
- [ ] **No decorative icons.** Each icon maps to a status, step, or action. (No `Sparkles`.)
- [ ] **No random gradients.** No gradient hero text; color is navy/blue/red-for-critical only.
- [ ] **No glassmorphism.** Zero `backdrop-blur` glass cards (per `DESIGN.md`).
- [ ] **No fabricated proof.** No hardcoded testimonials, no fake gallery. Real DB data, gated on existence.
- [ ] **No filler sections/stats.** Every section moves toward trust, understanding, or action. No "24/7 / 100%."
- [ ] **No template cards.** Cards differ by content and meaning, not five accent hues; no "Most Popular" badges.
- [ ] **No dead-end CTAs.** Every Apply/Verify button reaches a real destination.
- [ ] **No meaningless motion.** Motion communicates (reveal, count, verify-stamp) and respects reduced-motion.
- [ ] **No stock-photo energy.** Documentary real photos or none.
- [ ] **No "future of X" language.** Banned-word list enforced.
- [ ] **One brand name.** "WSL EMS" everywhere, including `<title>`/OG. "Asclepius" never public-facing.
- [ ] **Design-system fidelity.** Light surfaces, navy authority, clinical-blue interaction, tokens not hexes.
- [ ] **Contrast AA.** No low-opacity text on dark; verified by checker.

---

## Final Design Direction

Build the homepage as **an official registry that happens to have world-class design discipline** — the calm authority of a licensing board, executed in the light, clinical, deep-navy system the brand already specified and then ignored. Lead with the verification tool because that is the product and the proof; make the page tell the truth about what WSL EMS is (a training center *and* the public record of its graduates) and tell the truth in the data (real counts, honest expired states, no fake faces); and give the people who want to *become* EMTs a clearly-marked lane with a real door at the end. Restraint is the aesthetic. Every pixel either builds trust, creates understanding, or drives one of two actions — verify a credential, or apply to earn one. Nothing decorates. That is the entire brief.
