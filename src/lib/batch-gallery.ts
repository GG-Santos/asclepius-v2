import type { Prisma } from "@prisma/client";

export type BatchGalleryItem = {
  url: string;
  title: string;
  caption: string;
  date: string;
  order: number;
};

function cleanText(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanDate(value: unknown): string {
  const raw = cleanText(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeGalleryItems(
  galleryItems: Prisma.JsonValue | null | undefined,
  galleryUrls: readonly string[] | null | undefined = [],
): BatchGalleryItem[] {
  const fromJson = Array.isArray(galleryItems)
    ? galleryItems
        .map((item, index) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }
          const record = item as Record<string, unknown>;
          const url = cleanText(record.url, 2000);
          if (!isHttpUrl(url)) return null;
          const order =
            typeof record.order === "number" && Number.isFinite(record.order)
              ? record.order
              : index;
          return {
            url,
            title: cleanText(record.title, 120),
            caption: cleanText(record.caption, 500),
            date: cleanDate(record.date),
            order,
          };
        })
        .filter((item): item is BatchGalleryItem => item !== null)
    : [];

  const source =
    fromJson.length > 0
      ? fromJson
      : (galleryUrls ?? [])
          .filter((url) => isHttpUrl(url))
          .map((url, index) => ({
            url,
            title: "",
            caption: "",
            date: "",
            order: index,
          }));

  return source
    .map((item, index) => ({ ...item, order: item.order ?? index }))
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

export function galleryItemsToJson(
  items: readonly BatchGalleryItem[],
): Prisma.InputJsonValue {
  return items.map((item, index) => ({
    url: item.url,
    title: item.title,
    caption: item.caption,
    date: item.date,
    order: index,
  }));
}

export function galleryUrlsFromItems(
  items: readonly BatchGalleryItem[],
): string[] {
  return items.map((item) => item.url);
}

export function buildGalleryItem(input: {
  url: string;
  title?: string | null;
  caption?: string | null;
  date?: string | null;
  order?: number;
}): BatchGalleryItem {
  return {
    url: input.url,
    title: cleanText(input.title, 120),
    caption: cleanText(input.caption, 500),
    date: cleanDate(input.date),
    order: input.order ?? 0,
  };
}
