import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ConsentBanner } from "@/components/consent-banner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
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
      className={`${hanken.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full bg-background font-sans text-on-surface"
        suppressHydrationWarning
      >
        <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
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
            toastOptions={{ style: { fontFamily: "var(--font-hanken)" } }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
