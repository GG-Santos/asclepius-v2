import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

function patchAssessmentDates(value: Prisma.JsonValue): Prisma.JsonValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const scheme = value as Record<string, unknown>;

  const patchAssessment = (item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const assessment = { ...(item as Record<string, unknown>) };
    if (assessment.key === "cct" || assessment.key === "ccm") {
      assessment.date = "2025-06-29";
    }
    return assessment;
  };

  const categories = Array.isArray(scheme.categories)
    ? scheme.categories.map((category) => {
        if (
          !category ||
          typeof category !== "object" ||
          Array.isArray(category)
        ) {
          return category;
        }
        const row = { ...(category as Record<string, unknown>) };
        row.assessments = Array.isArray(row.assessments)
          ? row.assessments.map(patchAssessment)
          : row.assessments;
        return row;
      })
    : scheme.categories;

  const components = Array.isArray(scheme.components)
    ? scheme.components.map(patchAssessment)
    : scheme.components;

  return { ...scheme, categories, components } as Prisma.JsonValue;
}

async function main() {
  const rows = await prisma.batch.findMany({
    where: { code: "BATCH-12", gradingScheme: { not: null } },
    select: { id: true, gradingScheme: true },
  });

  for (const row of rows) {
    await prisma.batch.update({
      where: { id: row.id },
      data: {
        gradingScheme: patchAssessmentDates(
          row.gradingScheme,
        ) as Prisma.InputJsonValue,
      },
    });
  }

  console.log(`Patched ${rows.length} Batch 12 saved scheme(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
