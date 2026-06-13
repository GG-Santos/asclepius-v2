import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { ConsentBanner } from "@/components/consent-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "WSL EMS — Verify an EMT's License",
    template: "%s · WSL EMS",
  },
  description:
    "The official registry of Emergency Medical Technicians trained and certified at WSL EMS. Verify any EMT credential — free, instant, no account required.",
  openGraph: {
    title: "WSL EMS — Verify an EMT's License",
    description:
      "Verify an EMT's license in seconds against the official WSL EMS registry. Free, instant, no account required.",
    siteName: "WSL EMS",
    type: "website",
    images: [
      {
        url: "/assets/img/generated/og-default.png",
        width: 1200,
        height: 630,
        alt: "WSL EMS — EMT Credential Registry",
      },
    ],
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "WSL EMS Safety and Rescue Training Center",
  alternateName: "WSL EMS",
  description:
    "Emergency Medical Services training center and the official public registry of the EMTs it has trained and certified.",
  slogan: "We Save Lives",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full bg-background font-sans text-on-surface"
        suppressHydrationWarning
      >
        {/* No-FOUC theme bootstrap. next/script with beforeInteractive is the
            Next-sanctioned path: injected into the initial HTML by Next itself
            (before hydration), so React never renders a raw <script> element
            on the client (React 19.2 warns on those). */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time constant, not user input
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
        <Script
          id="org-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data, not user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ConsentBanner />
          <Toaster
            position="top-center"
            richColors
            toastOptions={{ style: { fontFamily: "var(--font-geist-sans)" } }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
