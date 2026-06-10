import { cn } from "@/lib/utils";

// Course cover: renders the image when present, otherwise a branded deep-teal
// gradient with the course initials so imageless courses still look intentional.
function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "·";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function CourseCover({
  title,
  src,
  className,
}: {
  title: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden",
        !src && "course-cover-fallback",
        className,
      )}
    >
      {src ? (
        // biome-ignore lint/performance/noImgElement: author-supplied external cover, sizes vary
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-bold text-2xl text-white/85 tracking-wide">
          {initials(title)}
        </span>
      )}
    </div>
  );
}
