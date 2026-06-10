import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ModelHotspot } from "@/app/dashboard/models/actions";
import { ModelEditor } from "@/components/dashboard/model-editor";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function ModelEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const model = await prisma.model3D.findUnique({ where: { id } });
  if (!model) notFound();

  const display = (model.display ?? {}) as {
    environment?: string;
    autoRotate?: boolean;
  };
  const hotspots = (Array.isArray(model.hotspots)
    ? model.hotspots
    : []) as unknown as ModelHotspot[];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <Link
          href="/dashboard/models"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> 3D Models
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-on-surface">
          Edit: {model.name}
        </h1>
      </div>
      <ModelEditor
        model={{
          id: model.id,
          name: model.name,
          description: model.description,
          fileUrl: model.fileUrl,
          environment: display.environment ?? "city",
          autoRotate: display.autoRotate ?? true,
          hotspots,
        }}
      />
    </div>
  );
}
