/* eslint-disable no-console */
const fs = require("node:fs");
const crypto = require("node:crypto");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

const BASE_URL = process.env.CAPTURE_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.CAPTURE_ADMIN_EMAIL;
const PASSWORD = process.env.CAPTURE_ADMIN_PASSWORD;
const CHANNEL = process.env.CAPTURE_BROWSER_CHANNEL ?? "msedge";
const VIEWPORT = { width: 1280, height: 720 };
const PUBLIC_ROOT = path.resolve("public/doc-media/registry");
const TMP_ROOT = path.resolve("tmp/registry-docs-capture");
const RUN = String(Date.now()).slice(-6);

if (!EMAIL || !PASSWORD) {
  console.error(
    "Set CAPTURE_ADMIN_EMAIL and CAPTURE_ADMIN_PASSWORD before running.",
  );
  process.exit(1);
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    const cache =
      process.env.npm_config_cache ??
      path.join(os.homedir(), "AppData", "Local", "npm-cache");
    const npxRoot = path.join(cache, "_npx");
    if (fs.existsSync(npxRoot)) {
      for (const dir of fs.readdirSync(npxRoot)) {
        const candidate = path.join(npxRoot, dir, "node_modules", "playwright");
        if (fs.existsSync(path.join(candidate, "package.json"))) {
          return require(candidate);
        }
      }
    }
    throw new Error(
      "Could not load Playwright. Run `npx playwright --version` once, then retry.",
    );
  }
}

const { chromium } = loadPlaywright();
const prisma = new PrismaClient();

const quizMax = {
  q1: 40,
  q2: 60,
  q3: 100,
  q4: 100,
  q5: 60,
  q6: 50,
  q7: 50,
  q8: 40,
  q9: 200,
  q10: 100,
};

function stamp(theme, kind) {
  return `${RUN}-${theme[0].toUpperCase()}-${kind}`;
}

function code(theme, kind) {
  return `BATCH-${stamp(theme, kind)}`.toUpperCase();
}

function lcn(theme, kind) {
  return `DOCS-${stamp(theme, kind)}`.toUpperCase();
}

function studentNo(theme, kind) {
  return `S-2026-${stamp(theme, kind)}`.toUpperCase();
}

function signCookieValue(value, secret) {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("base64");
  return encodeURIComponent(`${value}.${signature}`);
}

async function createBatch(theme, kind, label) {
  const batchCode = code(theme, kind);
  return prisma.batch.upsert({
    where: { code: batchCode },
    update: {
      label,
      professor: "Docs Capture Instructor",
      description: `Docs capture batch for ${label}.`,
      graduated: false,
      graduatedAt: null,
      graduationRequested: false,
    },
    create: {
      code: batchCode,
      label,
      professor: "Docs Capture Instructor",
      description: `Docs capture batch for ${label}.`,
    },
  });
}

async function createStudent(theme, kind, batch, firstName, lastName) {
  const enrollmentNo = studentNo(theme, kind);
  return prisma.student.upsert({
    where: { enrollmentNo },
    update: {
      name: `${firstName} ${lastName}`,
      firstName,
      middleName: "Capture",
      lastName,
      suffix: null,
      batchId: batch.id,
      batchCode: batch.code,
      status: "IN_TRAINING",
      graduatedToLcn: null,
      granularGrades: quizMax,
      scoreFWE: 920,
      scoreEP: 92,
      scorePAS: 184,
      scoreCCST: 92,
      scoreCCSM: 92,
      bonusPoints: 0,
    },
    create: {
      enrollmentNo,
      name: `${firstName} ${lastName}`,
      firstName,
      middleName: "Capture",
      lastName,
      batchId: batch.id,
      batchCode: batch.code,
      status: "IN_TRAINING",
      granularGrades: quizMax,
      scoreFWE: 920,
      scoreEP: 92,
      scorePAS: 184,
      scoreCCST: 92,
      scoreCCSM: 92,
      bonusPoints: 0,
    },
  });
}

async function createGraduate(theme, kind, batch, firstName, lastName) {
  const issuedAt = new Date("2026-01-15T00:00:00");
  const expiresAt = new Date("2027-01-15T00:00:00");
  const graduateLcn = lcn(theme, kind);
  return prisma.graduate.upsert({
    where: { lcn: graduateLcn },
    update: {
      name: `${firstName} ${lastName}`,
      firstName,
      middleName: "Capture",
      lastName,
      suffix: null,
      issuedAt,
      issuedRaw: "January 15, 2026",
      expiresAt,
      expirationRaw: "January 15, 2027",
      registrationRaw: null,
      registeredAt: null,
      recertifiedAt: null,
      batchId: batch.id,
      batchCode: batch.code,
      status: "GRADUATE",
      legacy: false,
      scoreFWE: 9.2,
      scoreSJE: 15,
      scoreEP: 9.2,
      scorePAS: 13.8,
      scoreCCST: 23,
      scoreCCSM: 23,
      bonusPoints: 0,
      ranking: 0,
    },
    create: {
      lcn: graduateLcn,
      name: `${firstName} ${lastName}`,
      firstName,
      middleName: "Capture",
      lastName,
      issuedAt,
      issuedRaw: "January 15, 2026",
      expiresAt,
      expirationRaw: "January 15, 2027",
      batchId: batch.id,
      batchCode: batch.code,
      status: "GRADUATE",
      legacy: false,
      scoreFWE: 9.2,
      scoreSJE: 15,
      scoreEP: 9.2,
      scorePAS: 13.8,
      scoreCCST: 23,
      scoreCCSM: 23,
      bonusPoints: 0,
      ranking: 0,
    },
  });
}

async function seed(theme) {
  const editBatch = await createBatch(theme, "EB", `Docs ${theme} edit`);
  const deleteBatch = await createBatch(theme, "DB", `Docs ${theme} delete`);
  const studentBatch = await createBatch(theme, "ST", `Docs ${theme} students`);
  const gradBatch = await createBatch(theme, "GB", `Docs ${theme} graduation`);
  const graduateBatch = await createBatch(
    theme,
    "GR",
    `Docs ${theme} registry`,
  );

  const editStudent = await createStudent(
    theme,
    "ES",
    studentBatch,
    `Docs ${theme}`,
    "Edit Student",
  );
  const deleteStudent = await createStudent(
    theme,
    "DS",
    studentBatch,
    `Docs ${theme}`,
    "Delete Student",
  );
  const graduationStudent = await createStudent(
    theme,
    "GS",
    gradBatch,
    `Docs ${theme}`,
    "Graduating",
  );
  const editGraduate = await createGraduate(
    theme,
    "EG",
    graduateBatch,
    `Docs ${theme}`,
    "Edit Graduate",
  );
  const renewGraduate = await createGraduate(
    theme,
    "RG",
    graduateBatch,
    `Docs ${theme}`,
    "Renew Graduate",
  );
  const downloadGraduate = await createGraduate(
    theme,
    "DG",
    graduateBatch,
    `Docs ${theme}`,
    "Download Graduate",
  );
  const deleteGraduate = await createGraduate(
    theme,
    "XG",
    graduateBatch,
    `Docs ${theme}`,
    "Delete Graduate",
  );

  return {
    editBatch,
    deleteBatch,
    studentBatch,
    gradBatch,
    graduateBatch,
    editStudent,
    deleteStudent,
    graduationStudent,
    editGraduate,
    renewGraduate,
    downloadGraduate,
    deleteGraduate,
  };
}

async function setTheme(page, theme) {
  await page.addInitScript((selectedTheme) => {
    localStorage.setItem("theme", selectedTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(selectedTheme);
  }, theme);
}

async function loginStorage(browser, theme) {
  const statePath = path.join(TMP_ROOT, `state-${theme}.json`);
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, role: true, locked: true },
  });
  if (!user || user.role !== "admin" || user.locked) {
    throw new Error(
      "Capture account must exist, be unlocked, and have admin role.",
    );
  }
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      token,
      expiresAt,
      userId: user.id,
      ipAddress: "127.0.0.1",
      userAgent: "registry-docs-capture",
    },
  });
  const cookieValue = signCookieValue(token, process.env.BETTER_AUTH_SECRET);
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(expiresAt.getTime() / 1000),
    },
  ]);
  const page = await context.newPage();
  await setTheme(page, theme);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  const rejectOptional = page.getByRole("button", { name: "Reject optional" });
  if (await rejectOptional.isVisible().catch(() => false)) {
    await rejectOptional.click();
  }
  await context.storageState({ path: statePath });
  await context.close();
  return statePath;
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(450);
}

async function pauseForVideoMoment(page) {
  await settle(page);
}

async function runWorkflow(browser, statePath, theme, slug, fn) {
  const videoDir = path.join(TMP_ROOT, "videos", slug, theme);
  fs.mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: statePath,
    acceptDownloads: true,
    recordVideo: { dir: videoDir, size: VIEWPORT },
  });
  const page = await context.newPage();
  await setTheme(page, theme);
  const downloadsDir = path.join(TMP_ROOT, "downloads", slug, theme);
  fs.mkdirSync(downloadsDir, { recursive: true });
  try {
    await fn(page, downloadsDir);
  } catch (error) {
    await page.screenshot({
      path: path.join(TMP_ROOT, `${slug}-${theme}-failure.png`),
      fullPage: true,
    });
    throw error;
  } finally {
    const video = page.video();
    await context.close();
    if (video) {
      const videoPath = await video.path();
      const targetDir = path.join(PUBLIC_ROOT, slug);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(videoPath, path.join(targetDir, `${theme}.webm`));
    }
  }
}

async function fillScoreFields(page) {
  for (const [name, value] of Object.entries(quizMax)) {
    await page.locator(`input[name="${name}"]`).first().fill(String(value));
  }
  await page.locator('input[name="scoreFWE"]').first().fill("920");
  await page.locator('input[name="scoreEP"]').first().fill("92");
  await page.locator('input[name="scorePAS"]').first().fill("184");
  await page.locator('input[name="scoreCCST"]').first().fill("92");
  await page.locator('input[name="scoreCCSM"]').first().fill("92");
}

async function confirmDialog(page, label) {
  await appDialog(page).getByRole("button", { name: label }).click();
}

function appDialog(page) {
  return page.locator('[role="dialog"][data-state="open"]').last();
}

function batchSearch(page) {
  return page.locator('input[placeholder^="Search batch"]').first();
}

function studentSearch(page) {
  return page.locator('input[placeholder^="Search name"]').first();
}

async function main() {
  fs.mkdirSync(PUBLIC_ROOT, { recursive: true });
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  for (const theme of ["light", "dark"]) {
    console.log(`Preparing ${theme} data`);
    const data = await seed(theme);
    const statePath = await loginStorage(browser, theme);
    const themeLabel = theme === "light" ? "Light" : "Dark";

    await runWorkflow(
      browser,
      statePath,
      theme,
      "create-batch",
      async (page) => {
        const batchCode = code(theme, "CB");
        await page.goto(`${BASE_URL}/dashboard/batches`);
        await page.getByRole("button", { name: "New batch" }).click();
        await page.locator("#code").fill(batchCode);
        await page.locator("#label").fill(`Docs ${themeLabel} created batch`);
        await page.locator("#professor").fill("Docs Capture Instructor");
        await page.getByRole("button", { name: "Create batch" }).click();
        await settle(page);
        await batchSearch(page).fill(batchCode);
        await pauseForVideoMoment(page);
      },
    );

    await runWorkflow(browser, statePath, theme, "edit-batch", async (page) => {
      await page.goto(`${BASE_URL}/dashboard/batches`);
      await batchSearch(page).fill(data.editBatch.code);
      await page
        .locator(`a[title="Edit batch"][href$="/${data.editBatch.id}/edit"]`)
        .click();
      await settle(page);
      await page.locator("#label").fill(`Docs ${themeLabel} edited batch`);
      await page
        .locator("#description")
        .fill(
          `Edited during the ${themeLabel.toLowerCase()} documentation capture.`,
        );
      await page.getByRole("button", { name: "Save changes" }).click();
      await pauseForVideoMoment(page);
    });

    await runWorkflow(
      browser,
      statePath,
      theme,
      "delete-batch",
      async (page) => {
        await page.goto(`${BASE_URL}/dashboard/batches`);
        await batchSearch(page).fill(data.deleteBatch.code);
        await page.locator('button[title="Delete"]').click();
        await appDialog(page).waitFor();
        await pauseForVideoMoment(page);
        await confirmDialog(page, "Delete");
        await settle(page);
      },
    );

    await runWorkflow(
      browser,
      statePath,
      theme,
      "create-student",
      async (page) => {
        await page.goto(`${BASE_URL}/dashboard/students/new`);
        await page
          .locator('select[name="batchCode"]')
          .first()
          .selectOption(data.studentBatch.code);
        await page
          .locator('input[name="firstName"]')
          .first()
          .fill(`Docs ${themeLabel}`);
        await page.locator('input[name="middleName"]').first().fill("Capture");
        await page
          .locator('input[name="lastName"]')
          .first()
          .fill("New Student");
        await fillScoreFields(page);
        await page.getByRole("button", { name: "Create Student" }).click();
        await appDialog(page).waitFor();
        await confirmDialog(page, "Create Student");
        await page.waitForURL("**/dashboard/students", { timeout: 15000 });
        await studentSearch(page).fill("New Student");
        await pauseForVideoMoment(page);
      },
    );

    await runWorkflow(
      browser,
      statePath,
      theme,
      "edit-student",
      async (page) => {
        await page.goto(
          `${BASE_URL}/dashboard/students/${data.editStudent.id}/edit`,
        );
        await page.locator('input[name="middleName"]').first().fill("Updated");
        await page.locator('input[name="scoreCCSM"]').first().fill("94");
        await page.getByRole("button", { name: "Update Student" }).click();
        await appDialog(page).waitFor();
        await pauseForVideoMoment(page);
        await confirmDialog(page, "Update Student");
        await page.waitForURL("**/dashboard/students", { timeout: 15000 });
      },
    );

    await runWorkflow(
      browser,
      statePath,
      theme,
      "delete-student",
      async (page) => {
        await page.goto(
          `${BASE_URL}/dashboard/students/${data.deleteStudent.id}/edit`,
        );
        await page.getByRole("button", { name: "Delete" }).click();
        await appDialog(page).waitFor();
        await pauseForVideoMoment(page);
        await confirmDialog(page, "Delete");
        await page.waitForURL("**/dashboard/students", { timeout: 15000 });
      },
    );

    await runWorkflow(
      browser,
      statePath,
      theme,
      "graduate-batch",
      async (page) => {
        await page.goto(
          `${BASE_URL}/dashboard/batches/${data.gradBatch.id}/edit`,
        );
        await page
          .getByRole("button", { name: "Mark batch graduated" })
          .click();
        await appDialog(page).waitFor();
        await page.locator("#graduatedAt").fill("2026-06-12");
        await pauseForVideoMoment(page);
        await appDialog(page)
          .getByRole("button", { name: "Graduate 1 student(s)" })
          .click();
        await settle(page);
      },
    );

    await runWorkflow(
      browser,
      statePath,
      theme,
      "edit-graduate",
      async (page) => {
        await page.goto(
          `${BASE_URL}/dashboard/graduates/${data.editGraduate.id}/edit`,
        );
        await page.locator('input[name="middleName"]').first().fill("Updated");
        await page.getByRole("button", { name: "Update Record" }).click();
        await appDialog(page).waitFor();
        await pauseForVideoMoment(page);
        await confirmDialog(page, "Update Record");
        await settle(page);
      },
    );

    await runWorkflow(
      browser,
      statePath,
      theme,
      "renew-graduate",
      async (page) => {
        await page.goto(
          `${BASE_URL}/dashboard/graduates/${data.renewGraduate.id}`,
        );
        await page.getByRole("button", { name: /Renew/ }).click();
        await appDialog(page).waitFor();
        await pauseForVideoMoment(page);
        await appDialog(page).getByRole("button", { name: /Renew/ }).click();
        await settle(page);
      },
    );

    await runWorkflow(
      browser,
      statePath,
      theme,
      "download-credentials",
      async (page, downloadsDir) => {
        await page.goto(
          `${BASE_URL}/dashboard/graduates/${data.downloadGraduate.id}`,
        );
        await page.getByRole("button", { name: "View Certificate" }).click();
        await appDialog(page).waitFor();
        await pauseForVideoMoment(page);
        const certDownload = page.waitForEvent("download");
        await appDialog(page)
          .getByRole("button", { name: "Download PNG" })
          .click();
        await (await certDownload).saveAs(
          path.join(downloadsDir, `${theme}-certificate.png`),
        );
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "View Identity" }).click();
        await appDialog(page).waitFor();
        const frontDownload = page.waitForEvent("download");
        await page
          .locator('[role="dialog"][data-state="open"]')
          .last()
          .getByRole("button", { name: "Download front PNG" })
          .click();
        await (await frontDownload).saveAs(
          path.join(downloadsDir, `${theme}-id-front.png`),
        );
        await page.getByRole("button", { name: "Show back" }).click();
        const backDownload = page.waitForEvent("download");
        await page
          .locator('[role="dialog"][data-state="open"]')
          .last()
          .getByRole("button", { name: "Download back PNG" })
          .click();
        await (await backDownload).saveAs(
          path.join(downloadsDir, `${theme}-id-back.png`),
        );
      },
    );

    await runWorkflow(
      browser,
      statePath,
      theme,
      "delete-graduate",
      async (page) => {
        await page.goto(
          `${BASE_URL}/dashboard/graduates/${data.deleteGraduate.id}`,
        );
        await page.getByRole("button", { name: "Delete" }).click();
        await appDialog(page).waitFor();
        await pauseForVideoMoment(page);
        await confirmDialog(page, "Delete");
        await page.waitForURL("**/dashboard/graduates", { timeout: 15000 });
      },
    );
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("Registry docs capture complete.");
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
