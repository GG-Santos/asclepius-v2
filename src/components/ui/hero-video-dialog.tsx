"use client";

import { Play, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AnimationStyle =
  | "from-bottom"
  | "from-center"
  | "from-top"
  | "from-left"
  | "from-right"
  | "fade"
  | "top-in-bottom-out"
  | "left-in-right-out";

interface HeroVideoProps {
  animationStyle?: AnimationStyle;
  videoSrc: string;
  thumbnailSrc?: string;
  thumbnailAlt?: string;
  className?: string;
  previewClassName?: string;
  title?: string;
}

const animationVariants = {
  "from-bottom": {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  "from-center": {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 },
  },
  "from-top": {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
  },
  "from-left": {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  "from-right": {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "top-in-bottom-out": {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  "left-in-right-out": {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
} satisfies Record<
  AnimationStyle,
  {
    initial: Record<string, number | string>;
    animate: Record<string, number | string>;
    exit: Record<string, number | string>;
  }
>;

function isDirectVideo(src: string) {
  return /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(src);
}

export function HeroVideoDialog({
  animationStyle = "from-center",
  videoSrc,
  thumbnailSrc,
  thumbnailAlt = "Video thumbnail",
  className,
  previewClassName,
  title = "Video player",
}: HeroVideoProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const selectedAnimation = animationVariants[animationStyle];
  const previewSrc = thumbnailSrc ?? videoSrc;
  const previewIsVideo = isDirectVideo(previewSrc);
  const playerIsVideo = isDirectVideo(videoSrc);

  useEffect(() => {
    if (!isVideoOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsVideoOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isVideoOpen]);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label={`Play ${title}`}
        className="group relative block w-full cursor-pointer overflow-hidden rounded-md border border-outline-variant/60 bg-card p-0 shadow-[var(--shadow-clinical)] transition-colors hover:border-accent dark:border-white/[0.08]"
        onClick={() => setIsVideoOpen(true)}
      >
        {previewIsVideo ? (
          <video
            src={previewSrc}
            className={cn(
              "aspect-video w-full bg-black object-cover",
              previewClassName,
            )}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src={previewSrc}
            alt={thumbnailAlt}
            width={1280}
            height={720}
            className={cn(
              "aspect-video w-full bg-black object-cover",
              previewClassName,
            )}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors duration-200 group-hover:bg-black/25">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 backdrop-blur-md transition-transform duration-200 group-hover:scale-110">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-md">
              <Play className="ml-0.5 size-6 fill-current" aria-hidden />
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
            onClick={() => setIsVideoOpen(false)}
          >
            <motion.div
              {...selectedAnimation}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative aspect-video w-full max-w-5xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="absolute -top-12 right-0 rounded-full bg-black/60 p-2 text-white ring-1 ring-white/20 backdrop-blur-md transition-colors hover:bg-black/80"
                onClick={() => setIsVideoOpen(false)}
                aria-label="Close video"
              >
                <XIcon className="size-5" aria-hidden />
              </button>
              <div className="size-full overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl">
                {playerIsVideo ? (
                  <video
                    src={videoSrc}
                    title={title}
                    className="size-full"
                    controls
                    autoPlay
                    muted
                    playsInline
                  >
                    <track
                      kind="captions"
                      src="/doc-media/no-audio.vtt"
                      srcLang="en"
                      label="No audio"
                      default
                    />
                  </video>
                ) : (
                  <iframe
                    src={videoSrc}
                    title={title}
                    className="size-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
