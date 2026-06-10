import {
  AssetsLibrary,
  type LibraryItem,
} from "@/components/dashboard/assets-library";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  await requireAdmin();

  const [models, assets] = await Promise.all([
    prisma.model3D.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.contentAsset.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const items: LibraryItem[] = [
    ...models.map((m) => ({
      kind: "model" as const,
      id: m.id,
      name: m.name,
      url: m.posterUrl ?? "",
      slug: m.slug,
      mimeType: "model/gltf-binary",
      size: m.size,
      public: m.public,
      createdAt: m.createdAt.toISOString(),
    })),
    ...assets.map((a) => ({
      kind: (a.assetType === "video" ? "video" : "image") as "video" | "image",
      id: a.id,
      name: a.name,
      url: a.url,
      slug: null,
      mimeType: a.mimeType,
      size: a.size,
      public: a.public,
      createdAt: a.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <AssetsLibrary items={items} />
    </div>
  );
}
