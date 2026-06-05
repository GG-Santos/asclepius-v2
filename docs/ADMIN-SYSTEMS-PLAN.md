# Asclepius — Admin Systems Plan & Roadmap

Living plan for the Asclepius platform. Captures the architecture decisions from
the planning interview and the phased roadmap. Source of truth for scope; each
phase is executed under WabbleSpec (scope → specify → decompose → execute).

---

## 1. Audiences (three surfaces)

| Surface | Who | Entry | Capabilities |
|---|---|---|---|
| **Admin / staff** | admin, writer | `/login` → `/dashboard` | Manage students, graduates, batches, blog, analytics, staff, docs |
| **Public** | anyone | `/` | Verify a license, read the blog, public help/FAQ |
| **Graduate portal** | graduate | `/portal` (self-register via LCN **or** admin invite) | View own record/status, update own photo, **LMS courses** — gated by an active, non-expired license |

---

## 2. Decisions (from the interview)

- **Two separate collections** for `Student` and `Graduate`. Graduation **transfers** the student's data into a new graduate record (copy photo/name/batch, assign LCN, roll up grades), then archives the student. Both link to each other for audit.
- **Students have no LCN.** Keyed by an **auto enrollment number** (e.g., `S-2025-0001`).
- **Grades:** the six categories (FWE, SJE, EP, PAS, CCST, CCSM) are already averaged/computed scores. The full per-quiz / per-practical record does **not exist yet** → we stub a **`granularGrades` placeholder** on `Student` and ship a documented rollup function so "auto-compute the graduate's grades" is a later wiring step, not a redesign.
- **LCN auto-generated at graduation:** `A` + 2-digit batch + `-` + graduation date code. *(Assumption to confirm: matching existing data like `A09-240801`, the tail is `YYMM` + 2-digit sequence-per-batch. Confirm vs `YYMMDD`.)*
- **Graduate accounts:** self-register via LCN **and** admin invite/override.
- **LMS:** Course → Module → Lesson (MDX via fumadocs) + Enrollment + per-lesson progress + completion → CE certificate. **Self-enroll** from a published catalog.
- **License expiry → hard-lock** the LMS with a "renew to regain access" screen. Public verification still shows the truthful expired state.
- **Docs (fumadocs):** one engine, three trees — **public help/FAQ**, **staff runbook**, **LMS course content**.
- **Sidebar:** adopt the reference's collapsible shadcn sidebar (icon-collapsible, brand, grouped nav, docs page-tree, user block).
- **Portal scope (initial):** view own record + status, update own photo (re-scan), browse/enroll/learn courses. *(Card/cert/CE PNG self-download deferred — recommended later.)*

---

## 3. Data model

### Student (new collection)
- `enrollmentNo` (unique, auto — `S-YYYY-####`)
- `firstName / middleName / lastName / suffix`
- `batchCode`, `photo` (MediaAsset)
- **Summary scores** (entered today): `FWE, SJE, EP, PAS, CCST, CCSM` (Float?)
- **`granularGrades` placeholder** — `Json?` (future per-quiz/per-practical entries; shape TBD)
- `status`: `IN_TRAINING | GRADUATED | WITHDRAWN`
- `graduatedToLcn?` (set when promoted), timestamps, `createdBy`

### Graduate (existing collection, refined)
- `lcn` (unique, assigned at graduation), name parts, `photo`, `batchCode`
- six scores, `issuedRaw/At`, `expirationRaw/At`, `registrationRaw/At`
- `ranking` (auto, per-batch podium), `legacy` (auto, batch ≤ 5)
- `fromStudentEnrollmentNo?` (provenance), `status: GRADUATE | ARCHIVED`
- LMS: linked via the graduate account (see below)

### Promotion (event)
`promoteStudent(studentId)` →
1. generate LCN (batch + grad-date pattern),
2. `computeGraduateScores(student)` (rollup; today = passthrough of the six),
3. create `Graduate` (copy name/photo/batch + scores + LCN + dates),
4. set `student.status = GRADUATED`, `student.graduatedToLcn`,
5. recompute batch rankings.

### LMS
- `Course` (slug, title, summary, cover, `status: DRAFT|PUBLISHED`, required?)
- `Module` (course, title, order)
- `Lesson` (module, title, order, `mdxPath` → fumadocs content, durationMins)
- `Enrollment` (graduateAccountId, courseId, enrolledAt)
- `LessonProgress` (enrollmentId, lessonId, completedAt)
- `Certificate` (CE) — enrollment + issuedAt (renders via the certificate engine)

### Identity
- BetterAuth `User.role`: `admin | writer | graduate`
- Graduate account links to its `Graduate` record (`graduateLcn`)
- **License gate** (proxy + server): `graduate` may only reach `/portal/**`, and LMS routes require `verificationState(graduate) === "verified"`.

---

## 4. Cross-cutting rules
- **License validity is computed, never stored** — one `verificationState()` powers the LMS gate, the expiry banner, and public verification.
- **Registry is the system of record.** LMS enrollment references the graduate; it never copies registry data.
- **Promotion never deletes** — students are archived with a two-way link for audit.
- **Score rollup is a pure, tested function** so wiring real granular data later is a one-line change.
- **Audit log** for all mutating admin/portal actions (added in P5).

---

## 5. Phased roadmap

| Phase | Scope | Outcome |
|---|---|---|
| **P1 — Separation + promotion** *(next)* | `Student` collection (enrollment #, scores, granular placeholder), `/dashboard/students` CRUD, `promoteStudent` with auto-LCN + score rollup, two-way audit link, recompute rankings. Migrate current STUDENT-status graduates (if any) into the Student collection. | Clean student/graduate split with a real promotion flow. |
| **P2 — Sidebar + fumadocs** | Adopt the reference collapsible shadcn sidebar across `/dashboard`; stand up fumadocs with `public/`, `staff/`, `lms/` trees; render the docs page-tree in the sidebar. | Reference-grade shell + a real docs engine. |
| **P3 — Graduate accounts + portal** | `graduate` role, `/portal` login, self-register via LCN (+ verifying detail) and admin invite, license-gated portal shell, "view my record + status", "update my photo". | Graduates can log in; access tied to license validity. |
| **P4 — LMS** | Course/Module/Lesson authoring (admin), published catalog, self-enroll, lesson progress, completion → CE certificate, hard-lock on expiry. | Full LMS for active graduates. |
| **P5 — Ops** | Audit log, expiry/renewal email notifications, media library + orphan cleanup, settings (org/certificate/expiry policy), LMS analytics. | Production hardening. |

---

## 6. Open questions / assumptions
- **LCN tail format:** `YYMM`+seq vs `YYMMDD`+seq? (assuming `YYMM`+2-digit seq per batch).
- **Verifying detail for self-register:** which second factor — birthdate, email on file, or batch? (need a field graduates reliably know).
- **Granular grade shape:** defer until real assessment data exists; placeholder is `Json`.
- **CE certificate template:** reuse certificate renderer with course name (P4).

## 7. Non-goals (for now)
Payments, multi-tenant, native mobile, i18n, third-party LMS/SCORM import.
