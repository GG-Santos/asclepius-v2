import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { markItemDone } from "@/app/portal/(app)/courses/actions";
import { CeCertificate } from "@/components/portal/ce-certificate";
import {
  QuizRunner,
  type RunnerQuestion,
} from "@/components/portal/quiz-runner";
import { ViewTracker } from "@/components/portal/view-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadCourseView } from "@/lib/course-view";
import { coursesPrisma } from "@/lib/courses-db";
import { displayName } from "@/lib/graduate";
import { parseOptions } from "@/lib/lms";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { requireGraduate } from "@/lib/session";

export const dynamic = "force-dynamic";

function youtubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/** Fisher–Yates shuffle returning a new array (used for quiz randomization). */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function PortalItemPage({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { graduate } = await requireGraduate();
  const { slug, itemId } = await params;

  const view = await loadCourseView(graduate.lcn, slug);
  if (!view) notFound();
  if (!view.enrollment) redirect(`/portal/courses/${slug}`);

  // Flatten to an ordered list for prev/next + locate the current item,
  // keeping each item's module context for the player header.
  const flat = view.modules.flatMap((m, mi) =>
    m.items.map((it, ii) => ({
      ...it,
      moduleTitle: m.title,
      moduleNumber: mi + 1,
      itemInModule: ii + 1,
      moduleSize: m.items.length,
    })),
  );
  const index = flat.findIndex((i) => i.id === itemId);
  if (index === -1) notFound();
  const item = flat[index];
  // Locked items are not directly reachable.
  if (!item.available && !item.done) redirect(`/portal/courses/${slug}`);

  const prev = index > 0 ? flat[index - 1] : null;
  const next = index < flat.length - 1 ? flat[index + 1] : null;

  // Load type-specific content.
  let pageHtml: string | null = null;
  let quiz: {
    id: string;
    passingScore: number;
    allowedAttempts: number;
    attemptsUsed: number;
    bestScore: number | null;
    timeLimitMins: number | null;
    questions: RunnerQuestion[];
  } | null = null;

  if (item.type === "PAGE" && item.contentId) {
    const page = await coursesPrisma.page.findUnique({
      where: { id: item.contentId },
    });
    pageHtml = page ? sanitizeBlogHtml(page.body) : "";
  } else if (item.type === "QUIZ" && item.contentId) {
    const q = await coursesPrisma.quiz.findUnique({
      where: { id: item.contentId },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    if (q && q.state === "PUBLISHED") {
      const [attemptsUsed, progress] = await Promise.all([
        coursesPrisma.quizSubmission.count({
          where: { enrollmentId: view.enrollment.id, quizId: q.id },
        }),
        coursesPrisma.itemProgress.findUnique({
          where: {
            enrollmentId_moduleItemId: {
              enrollmentId: view.enrollment.id,
              moduleItemId: item.id,
            },
          },
        }),
      ]);
      // Shuffle questions and their options per render when the author enabled
      // it. Grading is keyed by id, so order never affects scoring.
      const ordered = q.shuffle ? shuffled(q.questions) : q.questions;
      quiz = {
        id: q.id,
        passingScore: q.passingScore,
        allowedAttempts: q.allowedAttempts,
        attemptsUsed,
        bestScore: progress?.bestScore ?? null,
        timeLimitMins: q.timeLimitMins,
        // Strip the `correct` flag before sending options to the browser.
        questions: ordered.map((qq) => {
          const opts = parseOptions(qq.options).map((o) => ({
            id: o.id,
            text: o.text,
          }));
          return {
            id: qq.id,
            type: qq.type,
            prompt: qq.prompt,
            points: qq.points,
            feedback: qq.feedback,
            options: q.shuffle ? shuffled(opts) : opts,
          };
        }),
      };
    }
  }

  const autoView =
    item.type !== "QUIZ" && item.completionRequirement === "MUST_VIEW";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {autoView && (
        <ViewTracker itemId={item.id} refreshOnComplete={!item.done} />
      )}

      <Link
        href={`/portal/courses/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> {view.course.title}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          <span className="text-accent">
            Module {item.moduleNumber} · {item.moduleTitle}
          </span>
          <span aria-hidden> — </span>
          Item {item.itemInModule} of {item.moduleSize}
        </p>
        {item.done && (
          <Badge variant="verified">
            <CheckCircle2 className="size-3.5" /> Complete
          </Badge>
        )}
      </div>

      <h1 className="text-2xl font-bold text-on-surface">{item.title}</h1>

      {/* Body by type */}
      {item.type === "PAGE" && (
        <article className="max-w-none">
          {pageHtml?.trim() ? (
            <div
              className="blog-prose"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized via sanitizeBlogHtml (DOMPurify)
              dangerouslySetInnerHTML={{ __html: pageHtml }}
            />
          ) : (
            <p className="text-sm text-on-surface-variant">
              This page has no content yet.
            </p>
          )}
        </article>
      )}

      {item.type === "VIDEO" && item.url && (
        <div className="overflow-hidden rounded-lg border border-outline-variant/60 bg-black">
          {youtubeEmbed(item.url) ? (
            <iframe
              src={youtubeEmbed(item.url) as string}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full"
            />
          ) : (
            // biome-ignore lint/a11y/useMediaCaption: author-supplied external media
            <video src={item.url} controls className="aspect-video w-full" />
          )}
        </div>
      )}

      {item.type === "FILE" && item.url && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <p className="text-sm text-on-surface-variant">
              Download the resource for this item.
            </p>
            <Button asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <Download aria-hidden /> Download
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {item.type === "EXTERNAL_URL" && item.url && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <p className="truncate text-sm text-on-surface-variant">
              {item.url}
            </p>
            <Button asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> Open link
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {item.type === "QUIZ" &&
        (quiz ? (
          <QuizRunner
            itemId={item.id}
            quizId={quiz.id}
            passingScore={quiz.passingScore}
            allowedAttempts={quiz.allowedAttempts}
            attemptsUsed={quiz.attemptsUsed}
            bestScore={quiz.bestScore}
            done={item.done}
            timeLimitMins={quiz.timeLimitMins}
            questions={quiz.questions}
          />
        ) : (
          <p className="text-sm text-on-surface-variant">
            This quiz is not available yet.
          </p>
        ))}

      {/* Footer nav + mark-done */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60 pt-5">
        {prev ? (
          <Button asChild variant="ghost">
            <Link href={`/portal/courses/${slug}/${prev.id}`}>
              <ArrowLeft aria-hidden /> Previous
            </Link>
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {item.completionRequirement === "MUST_MARK_DONE" && !item.done && (
            <form action={markItemDone}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="slug" value={slug} />
              <Button type="submit">
                <Check aria-hidden /> Mark complete
              </Button>
            </form>
          )}
          {next ? (
            <Button asChild variant={item.done ? "default" : "outline"}>
              <Link
                href={
                  next.available
                    ? `/portal/courses/${slug}/${next.id}`
                    : `/portal/courses/${slug}`
                }
              >
                Next <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button asChild variant={item.done ? "default" : "outline"}>
              <Link href={`/portal/courses/${slug}`}>Finish</Link>
            </Button>
          )}
        </div>
      </div>

      {view.enrollment.completedAt && view.enrollment.certificateNo && (
        <CeCertificate
          name={displayName(graduate)}
          courseTitle={view.course.title}
          certificateNo={view.enrollment.certificateNo}
          completedAt={view.enrollment.completedAt}
        />
      )}
    </div>
  );
}
