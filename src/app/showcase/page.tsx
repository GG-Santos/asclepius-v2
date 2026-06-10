import { Box } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "3D Showcase",
  description: "Explore WSL EMS training equipment in interactive 3D.",
};

export const dynamic = "force-dynamic";

export default async function ShowcasePage() {
  const models = await prisma.model3D.findMany({
    where: { public: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-10 md:px-8">
        <h1 className="text-3xl font-bold text-primary">3D Showcase</h1>
        <p className="mt-2 text-on-surface-variant">
          Explore our training equipment in interactive 3D — drag to rotate,
          scroll to zoom.
        </p>

        {models.length === 0 ? (
          <p className="mt-10 text-sm text-on-surface-variant">
            No 3D models published yet.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <Link
                key={m.id}
                href={`/showcase/${m.slug}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)] transition-shadow hover:shadow-[var(--shadow-clinical-md)]"
              >
                <div className="flex aspect-video items-center justify-center bg-gradient-to-b from-surface-container to-surface-low">
                  {m.posterUrl ? (
                    // biome-ignore lint/performance/noImgElement: blob poster on arbitrary domain
                    <img
                      src={m.posterUrl}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Box className="size-10 text-on-surface-variant/40 transition-transform group-hover:scale-110" />
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-semibold text-on-surface group-hover:text-accent">
                    {m.name}
                  </h2>
                  {m.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                      {m.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
