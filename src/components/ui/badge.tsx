import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Status chips: pill-shape, high-contrast text on a 10%-opacity tinted ground
// (per DESIGN.md status indicator spec).
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        verified: "bg-success/10 text-success",
        expired: "bg-secondary/10 text-secondary",
        pending: "bg-warning/10 text-warning",
        neutral: "bg-surface-highest text-on-surface-variant",
        legacy: "bg-on-surface-variant/10 text-on-surface-variant",
        primary: "bg-primary/10 text-primary",
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
