"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Comet card (Aceternity-style): the child floats in 3D, tilting toward the
 * pointer with a moving glare highlight. Used on the PUBLIC credential
 * surfaces as a presentation layer — the constant perspective distortion and
 * glare make a clean flat screen-grab awkward. A deterrent, not DRM: the
 * authoritative check is always the registry lookup itself.
 */
export function CometCard({
  rotateDepth = 12,
  translateDepth = 12,
  className,
  children,
}: {
  rotateDepth?: number;
  translateDepth?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 150, damping: 20 });
  const springY = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(
    springY,
    [-0.5, 0.5],
    [`${rotateDepth}deg`, `-${rotateDepth}deg`],
  );
  const rotateY = useTransform(
    springX,
    [-0.5, 0.5],
    [`-${rotateDepth}deg`, `${rotateDepth}deg`],
  );
  const translateX = useTransform(
    springX,
    [-0.5, 0.5],
    [`-${translateDepth}px`, `${translateDepth}px`],
  );
  const translateY = useTransform(
    springY,
    [-0.5, 0.5],
    [`${translateDepth}px`, `-${translateDepth}px`],
  );

  const glareX = useTransform(springX, [-0.5, 0.5], [10, 90]);
  const glareY = useTransform(springY, [-0.5, 0.5], [10, 90]);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.55) 6%, rgba(255,255,255,0.18) 24%, transparent 48%)`;

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <div className={cn(className)} style={{ perspective: "1400px" }}>
      <motion.div
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        whileHover={{ scale: 1.03 }}
        style={{
          rotateX,
          rotateY,
          translateX,
          translateY,
          transformStyle: "preserve-3d",
        }}
        className="relative rounded-xl shadow-[var(--shadow-clinical-md)]"
      >
        {children}
        {/* Moving glare — pointer-tracked highlight over the artifact. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl mix-blend-soft-light"
          style={{ background: glare }}
        />
      </motion.div>
    </div>
  );
}
