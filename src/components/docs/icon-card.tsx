import { Card } from "fumadocs-ui/components/card";
import {
  GraduationCap,
  LifeBuoy,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

// Fumadocs Card with a brand lucide icon chosen by a string key, so MDX stays
// clean (no JSX-in-attribute, which MDX resolves unreliably).
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  shield: ShieldCheck,
  graduates: GraduationCap,
  staff: Users,
  search: Search,
  help: LifeBuoy,
};

export function IconCard({
  icon,
  title,
  href,
  description,
}: {
  icon: keyof typeof ICONS;
  title: string;
  href?: string;
  description?: ReactNode;
}) {
  const Icon = ICONS[icon];
  return (
    <Card
      icon={Icon ? <Icon /> : undefined}
      title={title}
      href={href}
      description={description}
    />
  );
}
