import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Status chips: pill-shape, high-contrast text on a tinted ground.
// Dark: ring-1 adds luminance edge; glow on verified/expired signals live state.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-shadow",
  {
    variants: {
      variant: {
        verified:
          "bg-success/10 text-success " +
          "dark:bg-success/[0.12] dark:ring-1 dark:ring-success/[0.3] dark:shadow-[var(--glow-success)]",
        expired:
          "bg-secondary/10 text-secondary " +
          "dark:bg-secondary/[0.12] dark:ring-1 dark:ring-secondary/[0.3] dark:shadow-[var(--glow-error)]",
        pending:
          "bg-warning/10 text-warning " +
          "dark:bg-warning/[0.12] dark:ring-1 dark:ring-warning/[0.3]",
        neutral:
          "bg-surface-highest text-on-surface-variant " +
          "dark:ring-1 dark:ring-white/[0.06]",
        legacy:
          "bg-on-surface-variant/10 text-on-surface-variant " +
          "dark:bg-white/[0.05] dark:ring-1 dark:ring-white/[0.08]",
        primary:
          "bg-primary/10 text-primary " +
          "dark:bg-accent/[0.1] dark:text-accent dark:ring-1 dark:ring-accent/[0.2]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
