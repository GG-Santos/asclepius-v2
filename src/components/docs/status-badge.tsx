import { Archive, Clock, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

const STATUS = {
  verified: { variant: "verified", Icon: ShieldCheck, label: "Verified" },
  expired: { variant: "expired", Icon: Clock, label: "Expired" },
  archived: { variant: "neutral", Icon: Archive, label: "Archived" },
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
