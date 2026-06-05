import { Archive, Clock, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

// Renders the exact same status chip the verify result page uses (ui/badge
// variants), so the docs and the product can never drift apart.
const STATUS = {
  verified: { variant: "verified", Icon: ShieldCheck, label: "Verified" },
  expired: { variant: "expired", Icon: Clock, label: "Expired" },
  legacy: { variant: "legacy", Icon: Archive, label: "Legacy" },
} as const;

export function StatusBadge({
  status,
  children,
}: {
  status: keyof typeof STATUS;
  children?: ReactNode;
}) {
  const { variant, Icon, label } = STATUS[status];
  return (
    <Badge variant={variant}>
      <Icon className="size-3.5" aria-hidden />
      {children ?? label}
    </Badge>
  );
}
