/**
 * Migrate the legacy reference dataset into MongoDB + Vercel Blob.
 *
 *   npx tsx scripts/migrate-reference.ts
 *
 * - Reads every record under reference/src/data/LCN/BATCH-XX/*.ts
 *   (excluding LCN_Data.ts and TEMPLATE*).
 * - Uploads the matching ID photo (if present) to Vercel Blob, content-addressed
 *   by SHA-256, recording url + hash in MediaAsset (dedup by hash).
 * - Upserts each record by LCN, so re-running is idempotent.
 * - Flags incomplete legacy records.
 *
 * Self-contained (no "@/..." aliases, no "server-only") so it runs under tsx.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const prisma = new PrismaClient();

const REF_ROOT = "H:\\Asclepius\\reference";
const DATA_ROOT = join(REF_ROOT, "src", "data", "LCN");
const IMG_ROOT = join(REF_ROOT, "public", "assets", "img", "ID");

const PLACEHOLDERS = new Set([
  "legal name",
  "issued date",
  "expiry date",
  "latest registration date",
  "",
]);

function field(text: string, key: string): string | null {
  const m = text.match(new RegExp(`${key}\\s*:\\s*"([^"]*)"`));
  const v = m?.[1]?.trim();
  return v ? v : null;
}

function cleanText(v: string | null): string | null {
  if (!v) return null;
  return PLACEHOLDERS.has(v.toLowerCase()) ? null : v;
}

function parseScore(v: string | null): number | null {
  if (!v) return null;
  if (v === "00") return null; // legacy placeholder for "missing"
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

function splitName(raw: string | null): {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: string | null;
} {
  const tokens = raw?.trim().split(/\s+/).filter(Boolean) ?? [];
  const empty = {
    firstName: null,
    middleName: null,
    lastName: null,
    suffix: null,
  };
  if (tokens.length === 0) return empty;
  let suffix: string | null = null;
  if (SUFFIXES.has(tokens[tokens.length - 1].toLowerCase())) {
    suffix = tokens.pop() ?? null;
  }
  if (tokens.length === 1) return { ...empty, firstName: tokens[0], suffix };
  const firstName = tokens.shift() ?? null;
  const lastName = tokens.pop() ?? null;
  const middleName = tokens.join(" ") || null;
  return { firstName, middleName, lastName, suffix };
}

function parseDate(v: string | null): Date | null {
  if (!v) return null;
  const cleaned = v
    .replace(/sept\b/gi, "Sep")
    .replace(/,(\S)/g, ", $1")
    .replace(/\s+/g, " ");
  const t = Date.parse(cleaned);
  return Number.isNaN(t) ? null : new Date(t);
}

async function uploadPhoto(
  filePath: string,
  _lcn: string,
): Promise<string | undefined> {
  const buffer = readFileSync(filePath);
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  const existing = await prisma.mediaAsset.findFirst({
    where: { contentHash },
  });
  if (existing) return existing.id;

  const blob = await put(`graduates/${contentHash}.png`, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const asset = await prisma.mediaAsset.create({
    data: {
      url: blob.url,
      pathname: blob.pathname,
      contentHash,
      contentType: "image/png",
      size: buffer.length,
    },
  });
  return asset.id;
}

async function main() {
  const batchDirs = readdirSync(DATA_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("BATCH-"))
    .map((d) => d.name)
    .sort();

  let imported = 0;
  let withPhoto = 0;
  let legacyCount = 0;

  for (const batchCode of batchDirs) {
    const dir = join(DATA_ROOT, batchCode);
    const files = readdirSync(dir).filter(
      (f) =>
        f.endsWith(".ts") &&
        f !== "LCN_Data.ts" &&
        !f.toUpperCase().startsWith("TEMPLATE"),
    );

    for (const file of files) {
      const text = readFileSync(join(dir, file), "utf8");
      const lcn = field(text, "lcn");
      if (!lcn || lcn.toUpperCase() === "TEMPLATE") continue;

      const name = cleanText(field(text, "name"));
      const issuedRaw = cleanText(field(text, "issued"));
      const expirationRaw = cleanText(field(text, "expiration"));
      const registrationRaw = cleanText(field(text, "registration"));
      const scores = {
        scoreFWE: parseScore(field(text, "FWE")),
        scoreSJE: parseScore(field(text, "SJE")),
        scoreEP: parseScore(field(text, "EP")),
        scorePAS: parseScore(field(text, "PAS")),
        scoreCCST: parseScore(field(text, "CCST")),
        scoreCCSM: parseScore(field(text, "CCSM")),
      };
      const rankingRaw = field(text, "ranking");
      const ranking = rankingRaw ? Number.parseInt(rankingRaw, 10) : null;
      const batchFromFile = field(text, "batch") ?? batchCode;

      const scoresMissing = Object.values(scores).every((s) => s === null);
      const legacy = !name || scoresMissing || !issuedRaw;
      if (legacy) legacyCount += 1;

      // Batch
      const batch = await prisma.batch.upsert({
        where: { code: batchFromFile },
        create: { code: batchFromFile },
        update: {},
      });

      // Photo
      let photoId: string | undefined;
      const photoPath = join(IMG_ROOT, batchFromFile, `${lcn}.png`);
      if (existsSync(photoPath)) {
        photoId = await uploadPhoto(photoPath, lcn);
        if (photoId) withPhoto += 1;
      }

      const data = {
        name,
        ...splitName(name),
        issuedRaw,
        issuedAt: parseDate(issuedRaw),
        expirationRaw,
        expiresAt: parseDate(expirationRaw),
        registrationRaw,
        registeredAt: parseDate(registrationRaw),
        ...scores,
        ranking: Number.isFinite(ranking) ? ranking : null,
        status: "GRADUATE" as const,
        legacy,
        batchId: batch.id,
        batchCode: batch.code,
        ...(photoId ? { photoId } : {}),
      };

      await prisma.graduate.upsert({
        where: { lcn },
        create: { lcn, ...data },
        update: data,
      });
      imported += 1;
    }
  }

  console.log(
    `✔ Migration complete: ${imported} records (${legacyCount} legacy, ${withPhoto} with photo) across ${batchDirs.length} batch folders.`,
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
