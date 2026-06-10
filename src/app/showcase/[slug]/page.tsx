import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Hotspot } from "@/components/model-viewer";
import { ModelViewerFrame } from "@/components/model-viewer-frame";
import { PublicHeader } from "@/components/public-header";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const model = await prisma.model3D.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  if (!model) return { title: "Not found" };
  return { title: model.name, description: model.description ?? undefined };
}

export default async function ShowcaseModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = await prisma.model3D.findUnique({ where: { slug } });
  if (!model) notFound();
  // Private models are previewable by admins only.
  if (!model.public) {
    const session = await getSession();
    if (session?.user.role !== "admin") notFound();
  }

  const display = (model.display ?? {}) as {
    environment?: string;
    autoRotate?: boolean;
  };
  const hotspots = (Array.isArray(model.hotspots)
    ? model.hotspots
    : []) as unknown as Hotspot[];

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8 md:px-8">
        <Link
          href="/showcase"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Showcase
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-surface">
              {model.name}
            </h1>
            {model.description && (
              <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
                {model.description}
              </p>
            )}
          </div>
          {!model.public && (
            <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
              Private preview
            </span>
          )}
        </div>

        <div className="mt-6 h-[62vh] min-h-[360px]">
          <ModelViewerFrame
            url={model.fileUrl}
            environment={display.environment ?? "city"}
            autoRotate={display.autoRotate ?? true}
            hotspots={hotspots}
            className="h-full w-full"
          />
        </div>
        <p className="mt-3 text-center text-xs text-on-surface-variant">
          Drag to rotate · scroll to zoom · right-drag to pan
        </p>
      </main>
    </div>
  );
}
