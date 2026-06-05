import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function PortalAuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-semibold text-primary"
        >
          <GraduationCap className="size-5 text-accent" aria-hidden />
          <span>Asclepius Graduate Portal</span>
        </Link>
        <Card className="p-6">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-on-surface">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
            )}
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}
