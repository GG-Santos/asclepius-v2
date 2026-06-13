import { cn } from "@/lib/utils";

export function StarOfLifeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary dark:text-accent-bright", className)}
      aria-hidden="true"
    >
      <rect x="15" y="2" width="10" height="36" rx="3" fill="currentColor" />
      <rect
        x="15"
        y="2"
        width="10"
        height="36"
        rx="3"
        fill="currentColor"
        transform="rotate(60 20 20)"
      />
      <rect
        x="15"
        y="2"
        width="10"
        height="36"
        rx="3"
        fill="currentColor"
        transform="rotate(120 20 20)"
      />
      <rect
        x="19"
        y="10"
        width="2"
        height="20"
        rx="1"
        fill="white"
        opacity="0.9"
      />
      <path
        d="M19 14Q23 17 19 20Q15 23 19 26"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
