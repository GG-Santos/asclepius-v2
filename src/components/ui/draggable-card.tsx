"use client";

import {
  animate,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type DragBounds = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

type DraggableCardBodyProps = Omit<
  React.ComponentProps<typeof motion.div>,
  "children"
> & {
  children?: React.ReactNode;
  onPress?: () => void;
  resetOnDragEnd?: boolean;
};

export function DraggableCardBody({
  className,
  children,
  drag = true,
  onDragStart,
  onDragEnd,
  onKeyDown,
  onMouseLeave,
  onMouseMove,
  onPress,
  onTap,
  resetOnDragEnd = false,
  role,
  style,
  tabIndex,
  ...props
}: DraggableCardBodyProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previousCursor = useRef("");
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [constraints, setConstraints] = useState<DragBounds>({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });

  const spring = { stiffness: 120, damping: 22, mass: 0.45 };
  const tilt = reduceMotion ? 0 : 14;
  const rotateX = useSpring(
    useTransform(mouseY, [-240, 240], [tilt, -tilt]),
    spring,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-240, 240], [-tilt, tilt]),
    spring,
  );
  const glareOpacity = useSpring(
    useTransform(mouseX, [-240, 0, 240], [0.16, 0, 0.16]),
    spring,
  );

  useEffect(() => {
    function updateConstraints() {
      setConstraints({
        top: -window.innerHeight / 2,
        left: -window.innerWidth / 2,
        right: window.innerWidth / 2,
        bottom: window.innerHeight / 2,
      });
    }

    updateConstraints();
    window.addEventListener("resize", updateConstraints);
    return () => {
      document.body.style.cursor = previousCursor.current;
      window.removeEventListener("resize", updateConstraints);
    };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      drag={reduceMotion ? false : drag}
      dragConstraints={constraints}
      dragElastic={0.18}
      dragMomentum={false}
      role={onPress ? "button" : role}
      tabIndex={onPress ? (tabIndex ?? 0) : tabIndex}
      animate={controls}
      whileHover={reduceMotion ? undefined : { scale: 1.015 }}
      style={{
        ...style,
        x,
        y,
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
      onDragStart={(event, info) => {
        previousCursor.current = document.body.style.cursor;
        document.body.style.cursor = "grabbing";
        onDragStart?.(event, info);
      }}
      onDragEnd={(event, info) => {
        document.body.style.cursor = previousCursor.current;
        controls.start({
          rotateX: 0,
          rotateY: 0,
          transition: { type: "spring", ...spring },
        });
        if (resetOnDragEnd) {
          animate(x, 0, { type: "spring", stiffness: 90, damping: 18 });
          animate(y, 0, { type: "spring", stiffness: 90, damping: 18 });
        }
        onDragEnd?.(event, info);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          onPress &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onPress();
        }
      }}
      onMouseMove={(event) => {
        if (!reduceMotion) {
          const rect = cardRef.current?.getBoundingClientRect();
          if (rect) {
            mouseX.set(event.clientX - (rect.left + rect.width / 2));
            mouseY.set(event.clientY - (rect.top + rect.height / 2));
          }
        }
        onMouseMove?.(event);
      }}
      onMouseLeave={(event) => {
        mouseX.set(0);
        mouseY.set(0);
        onMouseLeave?.(event);
      }}
      onTap={(event, info) => {
        onTap?.(event, info);
        onPress?.();
      }}
      className={cn(
        "relative cursor-grab touch-none select-none overflow-hidden rounded-lg border border-outline-variant/60 bg-card p-2 text-left shadow-[var(--shadow-clinical-md)] outline-none transition-colors",
        "hover:border-accent focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing motion-reduce:cursor-default",
        "dark:border-white/[0.08]",
        className,
      )}
      {...props}
    >
      {children}
      <motion.div
        aria-hidden
        style={{ opacity: glareOpacity }}
        className="pointer-events-none absolute inset-0 z-20 bg-white/60 mix-blend-overlay"
      />
    </motion.div>
  );
}

export function DraggableCardContainer({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("[perspective:3000px]", className)} {...props}>
      {children}
    </div>
  );
}
