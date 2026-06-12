import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Staff sign in",
};

export default function LoginPage() {
  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[1.2fr_1fr] lg:grid-cols-[1.5fr_1fr]">
      {/* Visual side panel - hidden on mobile, visible on desktop.
          Stable-dark zone: deep-teal brand gradient in BOTH modes, so the
          white text ladder stays legible regardless of theme. */}
      <div
        className="relative hidden flex-col justify-between p-10 text-white md:flex"
        style={{ background: "var(--gradient-deep)" }}
      >
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/img/generated/login-aside.webp"
            alt="Ambulance emergency blue light bar at dusk"
            fill
            priority
            className="object-cover opacity-30"
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/15" />
        </div>

        {/* Brand logo overlay */}
        <Link
          href="/"
          className="relative z-10 flex w-fit items-center gap-2 font-semibold text-white hover:text-white/80"
        >
          <ShieldCheck className="size-6 text-white" aria-hidden />
          <span className="text-lg tracking-tight">Asclepius</span>
        </Link>

        {/* Supporting message */}
        <div className="relative z-10 max-w-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Official EMS Registry
          </p>
          <h2 className="text-2xl font-bold leading-tight">
            Secure Access for Authorized Staff
          </h2>
          <p className="text-sm text-white/70">
            Sign in to manage graduate credentials, update training records, and
            publish official articles.
          </p>
        </div>
      </div>

      {/* Form side panel */}
      <div className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo visible on mobile only */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 font-semibold text-primary md:hidden"
          >
            <ShieldCheck className="size-5 text-accent" aria-hidden />
            <span>Asclepius</span>
          </Link>

          <Card className="p-6 shadow-[var(--shadow-clinical-md)]">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold text-on-surface">
                Staff sign in
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                Admin and professor access only.
              </p>
            </div>
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </Card>

          <p className="mt-6 text-center text-xs text-on-surface-variant">
            Graduates:{" "}
            <Link href="/portal/login" className="text-accent hover:underline">
              access the graduate portal
            </Link>
            . Public verification is on the{" "}
            <Link href="/" className="text-accent hover:underline">
              home page
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
