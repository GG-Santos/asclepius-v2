import "dotenv/config";
import { PrismaClient } from "../../src/generated/courses";

// Seeds one fully-formed sample course into the LMS database so the portal and
// dashboard have something real to render. Idempotent: re-running replaces the
// sample by slug. Run with: npm run db:seed:courses
const db = new PrismaClient();

const SLUG = "airway-management-refresher";

async function main() {
  const existing = await db.course.findUnique({ where: { slug: SLUG } });
  if (existing) {
    await db.course.delete({ where: { id: existing.id } });
    console.log("Removed previous sample course.");
  }

  const course = await db.course.create({
    data: {
      slug: SLUG,
      title: "Airway Management Refresher",
      summary:
        "A continuing-education refresher on airway assessment, adjuncts, and ventilation — ending in a graded competency check.",
      description:
        "<p>This CE course reviews the essentials of prehospital airway management and closes with a competency quiz you must pass to earn your certificate.</p>",
      state: "PUBLISHED",
      certificateEnabled: true,
      estimatedMins: 45,
    },
  });

  // Module 1 — Foundations (a reading page + a video, must view both).
  const m1 = await db.module.create({
    data: {
      courseId: course.id,
      title: "Foundations",
      position: 0,
      state: "PUBLISHED",
      requirementCount: "ALL",
    },
  });

  const page = await db.page.create({
    data: {
      courseId: course.id,
      title: "Airway Assessment",
      state: "PUBLISHED",
      body: `<h2>Assessing the airway</h2><p>Begin every patient contact with a look-listen-feel assessment. Note patency, added sounds (stridor, gurgling), and the work of breathing.</p><ul><li><strong>Patent</strong> — speaking in full sentences.</li><li><strong>Partial</strong> — stridor, hoarseness, accessory muscle use.</li><li><strong>Obstructed</strong> — silent chest, cyanosis, no air movement.</li></ul><p>Escalate adjuncts only as far as the patient tolerates.</p>`,
    },
  });

  await db.moduleItem.createMany({
    data: [
      {
        moduleId: m1.id,
        courseId: course.id,
        title: "Airway Assessment",
        type: "PAGE",
        position: 0,
        state: "PUBLISHED",
        contentId: page.id,
        completionRequirement: "MUST_VIEW",
        estimatedMins: 10,
      },
      {
        moduleId: m1.id,
        courseId: course.id,
        title: "Demonstration: OPA & NPA insertion",
        type: "VIDEO",
        position: 1,
        state: "PUBLISHED",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        completionRequirement: "MUST_VIEW",
        estimatedMins: 8,
      },
    ],
  });

  // Module 2 — Competency check (a quiz, must pass). Locked until Module 1 done.
  const m2 = await db.module.create({
    data: {
      courseId: course.id,
      title: "Competency Check",
      position: 1,
      state: "PUBLISHED",
      requirementCount: "ALL",
      prerequisiteModuleIds: [m1.id],
    },
  });

  const quiz = await db.quiz.create({
    data: {
      courseId: course.id,
      title: "Airway Competency Quiz",
      description: "Pass at 70% or higher to complete the course.",
      state: "PUBLISHED",
      passingScore: 70,
      allowedAttempts: -1,
    },
  });

  await db.question.createMany({
    data: [
      {
        quizId: quiz.id,
        position: 0,
        type: "MULTIPLE_CHOICE",
        prompt: "Which finding most strongly indicates a partially obstructed airway?",
        points: 1,
        options: [
          { id: "o0", text: "Inspiratory stridor", correct: true },
          { id: "o1", text: "Full sentences with no effort", correct: false },
          { id: "o2", text: "Pink, warm, dry skin", correct: false },
          { id: "o3", text: "Respiratory rate of 14", correct: false },
        ],
      },
      {
        quizId: quiz.id,
        position: 1,
        type: "TRUE_FALSE",
        prompt: "A nasopharyngeal airway is appropriate for a patient with an intact gag reflex.",
        points: 1,
        options: [
          { id: "o0", text: "True", correct: true },
          { id: "o1", text: "False", correct: false },
        ],
      },
      {
        quizId: quiz.id,
        position: 2,
        type: "MULTIPLE_ANSWER",
        prompt: "Select all signs of a complete airway obstruction.",
        points: 2,
        options: [
          { id: "o0", text: "Silent chest", correct: true },
          { id: "o1", text: "Cyanosis", correct: true },
          { id: "o2", text: "Loud, clear breath sounds", correct: false },
          { id: "o3", text: "Inability to speak or cough", correct: true },
        ],
      },
      {
        quizId: quiz.id,
        position: 3,
        type: "SHORT_ANSWER",
        prompt: "What three-letter adjunct is measured nostril-to-earlobe before insertion?",
        points: 1,
        correctAnswers: ["NPA", "nasopharyngeal airway"],
      },
    ],
  });

  await db.moduleItem.create({
    data: {
      moduleId: m2.id,
      courseId: course.id,
      title: "Airway Competency Quiz",
      type: "QUIZ",
      position: 0,
      state: "PUBLISHED",
      contentId: quiz.id,
      completionRequirement: "MUST_PASS",
      estimatedMins: 15,
    },
  });

  console.log(`Seeded course "${course.title}" (/portal/courses/${SLUG}).`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
