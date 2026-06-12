import { ArrowLeft, Database } from "lucide-react";
import Link from "next/link";
import { NewBankForm } from "@/components/dashboard/bank-forms";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { coursesPrisma } from "@/lib/courses-db";
import { requireAdmin } from "@/lib/session";

export default async function QuestionBanksPage() {
  await requireAdmin();

  const banks = await coursesPrisma.questionBank.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true, quizzes: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/courses"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Courses
      </Link>

      <div>
        <p className="text-label-caps text-accent">Learning · CE</p>
        <h1 className="mt-1 text-headline-lg text-on-surface">
          Question banks
        </h1>
        <p className="mt-1.5 max-w-prose text-sm text-on-surface-variant">
          Reusable question pools. Quizzes can copy questions in as snapshots or
          draw a random set from a bank on every attempt.
        </p>
      </div>

      <NewBankForm />

      {banks.length === 0 ? (
        <EmptyState
          icon={<Database aria-hidden />}
          title="No question banks yet"
          description="Create a bank, fill it with questions, then link it from any quiz."
        />
      ) : (
        <div className="space-y-3">
          {banks.map((bank) => (
            <Link
              key={bank.id}
              href={`/dashboard/courses/banks/${bank.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-accent/60">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-title-md text-on-surface">
                      {bank.title}
                    </h2>
                    {bank.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-on-surface-variant">
                        {bank.description}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-data-mono text-on-surface-variant">
                    {bank._count.questions} question
                    {bank._count.questions === 1 ? "" : "s"}
                    <span className="text-outline-variant"> · </span>
                    {bank._count.quizzes} linked quiz
                    {bank._count.quizzes === 1 ? "" : "zes"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
