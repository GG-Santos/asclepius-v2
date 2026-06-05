import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Deep Navy primary; hover transitions to Clinical Blue (per DESIGN.md).
        default: "bg-primary text-on-primary hover:bg-accent",
        secondary:
          "bg-secondary text-on-secondary hover:bg-secondary-container",
        outline:
          "border border-outline-variant bg-card text-on-surface hover:border-accent hover:text-accent",
        ghost: "text-on-surface-variant hover:bg-surface-container",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        // 48px default height per DESIGN.md primary button spec.
        default: "h-12 px-5 text-sm",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
