import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Vital Signs: high-contrast ink primary in light, inverted ink in
        // dark. Accent is reserved for focus rings, links, and highlights.
        default:
          "bg-primary text-on-primary hover:bg-primary-container " +
          "dark:hover:bg-on-surface dark:hover:shadow-[var(--glow-accent-soft)]",
        secondary:
          "bg-secondary text-on-secondary hover:bg-secondary-container",
        destructive:
          "border border-secondary/40 bg-secondary/5 text-secondary hover:bg-secondary hover:text-on-secondary " +
          "dark:border-secondary/40 dark:bg-secondary/[0.08] dark:hover:bg-secondary dark:hover:text-white",
        outline:
          "border border-outline-variant bg-card text-on-surface hover:border-accent hover:text-accent " +
          "dark:border-white/[0.1] dark:hover:border-accent/50 dark:hover:bg-accent/[0.06]",
        ghost:
          "text-on-surface-variant hover:bg-surface-container dark:hover:bg-white/[0.05]",
        link: "text-accent underline-offset-4 hover:underline dark:text-accent-bright",
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
