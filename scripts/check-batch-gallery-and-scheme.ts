import {
  computeSchemeResult,
  officialTemplateForBatchCode,
  parseSchemeScores,
} from "../src/lib/assessment-scheme";
import { normalizeGalleryItems } from "../src/lib/batch-gallery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const batch12 = officialTemplateForBatchCode("BATCH-12")?.scheme;
assert(batch12, "Batch 12 official scheme is missing.");
const cct = batch12.components.find((c) => c.key === "cct");
const ccm = batch12.components.find((c) => c.key === "ccm");
assert(cct?.date === "2025-06-29", "Batch 12 CCT date must be 2025-06-29.");
assert(ccm?.date === "2025-06-29", "Batch 12 CCM date must be 2025-06-29.");

const legacyGallery = normalizeGalleryItems(null, [
  "https://example.com/a.jpg",
  "https://example.com/b.jpg",
]);
assert(legacyGallery.length === 2, "Legacy gallery URLs must be readable.");
assert(
  legacyGallery[0]?.url === "https://example.com/a.jpg",
  "Legacy gallery order must be preserved.",
);

const structuredGallery = normalizeGalleryItems(
  [
    {
      url: "https://example.com/two.jpg",
      title: "Two",
      caption: "Second",
      date: "2025-06-02",
      order: 2,
    },
    {
      url: "https://example.com/one.jpg",
      title: "One",
      caption: "First",
      date: "2025-06-01",
      order: 1,
    },
  ],
  [],
);
assert(
  structuredGallery[0]?.title === "One",
  "Structured gallery must sort by order.",
);

const missingAsZero = computeSchemeResult(
  { ...batch12, missingAsZero: true },
  parseSchemeScores({ cct: 90 }, batch12),
  null,
);
assert(
  missingAsZero.verdict !== "incomplete",
  "missingAsZero=true should allow a verdict with blanks counted as zero.",
);

const missingBlocks = computeSchemeResult(
  { ...batch12, missingAsZero: false },
  parseSchemeScores({ cct: 90 }, batch12),
  null,
);
assert(
  missingBlocks.verdict === "incomplete",
  "missingAsZero=false should block the verdict while blanks remain.",
);

console.log("Batch gallery and scheme checks passed.");
