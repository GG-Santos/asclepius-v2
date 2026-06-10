"use client";

import {
  Box,
  Eye,
  FileVideo,
  Globe,
  Lock,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteContentAsset,
  setAssetPublic,
} from "@/app/dashboard/assets/actions";
import { deleteModel3d, setModelPublic } from "@/app/dashboard/models/actions";
import { AssetUploader } from "@/components/dashboard/asset-uploader";
import { CopyUrlButton } from "@/components/dashboard/copy-url-button";
import { DeleteActionButton } from "@/components/dashboard/delete-action-button";
import { ModelUploader } from "@/components/dashboard/model-uploader";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";

export type LibraryItem = {
  kind: "model" | "image" | "video";
  id: string;
  name: string;
  url: string; // poster (model) or file URL (image/video)
  slug: string | null; // model only
  mimeType: string | null;
  size: number | null;
  public: boolean;
  createdAt: string;
};

type FilterKey = "all" | "model" | "image" | "video";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "model", label: "3D Models" },
  { key: "image", label: "Images" },
  { key: "video", label: "Videos" },
];

function sizeLabel(size: number | null): string | null {
  if (!size) return null;
  return size > 1_000_000
    ? `${(size / 1_000_000).toFixed(1)} MB`
    : `${Math.round(size / 1024)} KB`;
}

export function AssetsLibrary({ items }: { items: LibraryItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(
    () => ({
      all: items.length,
      model: items.filter((i) => i.kind === "model").length,
      image: items.filter((i) => i.kind === "image").length,
      video: items.filter((i) => i.kind === "video").length,
    }),
    [items],
  );

  const filtered =
    filter === "all" ? items : items.filter((i) => i.kind === filter);

  function togglePublic(item: LibraryItem) {
    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("public", String(!item.public));
    startTransition(async () => {
      if (item.kind === "model") await setModelPublic(fd);
      else await setAssetPublic(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        meta={<p>3D models, images, and videos used across the site.</p>}
        actions={
          <Button onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? <X aria-hidden /> : <Plus aria-hidden />}
            {showAdd ? "Close" : "Add asset"}
          </Button>
        }
      />

      {showAdd && (
        <div className="grid gap-4 lg:grid-cols-3">
          <ModelUploader />
          <AssetUploader assetType="image" onDone={() => router.refresh()} />
          <AssetUploader assetType="video" onDone={() => router.refresh()} />
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-accent text-on-accent"
                  : "border border-outline-variant/60 text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  filter === f.key
                    ? "bg-on-accent/20"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-outline-variant/60 bg-card p-10 text-center text-sm text-on-surface-variant">
            {items.length === 0
              ? "No assets yet. Use “Add asset” to upload a 3D model, image, or video."
              : "No assets of this type yet."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="flex flex-col overflow-hidden rounded-xl border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)]"
              >
                <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-surface-highest">
                  {item.kind === "video" ? (
                    <div className="flex flex-col items-center gap-2 text-on-surface-variant/40">
                      <FileVideo className="size-10" />
                      <span className="text-xs">
                        {item.mimeType || "video"}
                      </span>
                    </div>
                  ) : item.url ? (
                    // biome-ignore lint/performance/noImgElement: admin asset on arbitrary blob domain
                    <img
                      src={item.url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Box className="size-10 text-on-surface-variant/40" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-on-surface">
                      {item.name}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        item.public
                          ? "bg-success/15 text-success"
                          : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {item.public ? (
                        <Globe className="size-3" />
                      ) : (
                        <Lock className="size-3" />
                      )}
                      {item.public ? "Public" : "Private"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs capitalize text-on-surface-variant">
                    {item.kind === "model" ? "3D model" : item.kind}
                    {sizeLabel(item.size) ? ` · ${sizeLabel(item.size)}` : ""}
                  </p>

                  <div className="mt-3 flex items-center gap-1">
                    {item.kind === "model" ? (
                      <>
                        <Link
                          href={`/showcase/${item.slug}`}
                          title="Preview"
                          className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <Link
                          href={`/dashboard/models/${item.id}`}
                          title="Edit display & hotspots"
                          className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open"
                          className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                        >
                          <Eye className="size-4" />
                        </a>
                        <CopyUrlButton url={item.url} />
                      </>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => togglePublic(item)}
                      title={item.public ? "Make private" : "Make public"}
                      className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-accent disabled:opacity-40"
                    >
                      {item.public ? (
                        <Lock className="size-4" />
                      ) : (
                        <Globe className="size-4" />
                      )}
                    </button>
                    <div className="ml-auto">
                      <DeleteActionButton
                        action={
                          item.kind === "model"
                            ? deleteModel3d
                            : deleteContentAsset
                        }
                        id={item.id}
                        title={`Delete "${item.name}"?`}
                        description={
                          item.kind === "model"
                            ? "This permanently removes the 3D model and its showcase page. This cannot be undone."
                            : "This permanently removes the file from the library. This cannot be undone."
                        }
                        successMessage="Deleted."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
