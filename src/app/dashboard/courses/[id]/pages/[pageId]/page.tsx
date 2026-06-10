import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageEditor } from "@/components/dashboard/page-editor";
import { coursesPrisma } from "@/lib/courses-db";
import { requireAdmin } from "@/lib/session";

export default async function PageEditorRoute({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  await requireAdmin();
  const { id, pageId } = await params;

  const page = await coursesPrisma.page.findUnique({ where: { id: pageId } });
  if (!page || page.courseId !== id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/dashboard/courses/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Back to course
      </Link>
      <h1 className="text-2xl font-bold text-on-surface">Edit page</h1>
      <PageEditor courseId={id} page={page} />
    </div>
  );
}
