import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type HomePageContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroBody: string;
  heroImageUrl: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutBodyOne: string;
  aboutBodyTwo: string;
  aboutImageUrl: string;
  programsEyebrow: string;
  programsTitle: string;
  programsBody: string;
  programImageUrl: string;
  finalCtaTitle: string;
  finalCtaBody: string;
  upcomingShow: string;
  upcomingProgram: string;
  upcomingStartAt: string;
  upcomingStatus: string;
  upcomingCapacity: string;
  upcomingCtaUrl: string;
};

export const HOME_CONTENT_DEFAULTS: HomePageContent = {
  heroEyebrow: "Official EMT Credential Registry",
  heroTitle: "Verify an EMT's license",
  heroAccent: "in seconds.",
  heroBody:
    "The official registry of Emergency Medical Technicians trained and certified at WSL EMS.",
  heroImageUrl: "",
  aboutEyebrow: "What WSL EMS is",
  aboutTitle: "A training center - and the public record of its graduates.",
  aboutBodyOne:
    "WSL EMS trains and certifies Emergency Medical Technicians. This registry is the public record of everyone we've certified, so employers, agencies, and patients can confirm that a responder holds a real, current credential.",
  aboutBodyTwo:
    "Every technician completes written examinations, practical skills evaluations, and supervised clinical training before a license is issued.",
  aboutImageUrl: "/assets/img/generated/about-team.webp",
  programsEyebrow: "Programs & training",
  programsTitle: "ASHI-accredited EMS training, built for real emergencies.",
  programsBody:
    "Every program is accredited by the American Safety & Health Institute and evaluated by written exam, practical skills, and supervised clinical hours.",
  programImageUrl: "",
  finalCtaTitle: "Confirm a credential - or start your own.",
  finalCtaBody:
    "Verification is free, instant, and open to anyone. Training enrollment is one message away.",
  upcomingShow: "false",
  upcomingProgram: "",
  upcomingStartAt: "",
  upcomingStatus: "",
  upcomingCapacity: "",
  upcomingCtaUrl: "",
};

function cleanText(value: unknown, fallback: string, max = 700): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function cleanUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  if (raw.startsWith("/")) return raw.slice(0, 2000);
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? raw.slice(0, 2000)
      : fallback;
  } catch {
    return fallback;
  }
}

export function parseHomePageContent(raw: Prisma.JsonValue | null | undefined) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return HOME_CONTENT_DEFAULTS;
  }
  const record = raw as Record<string, unknown>;
  return {
    heroEyebrow: cleanText(
      record.heroEyebrow,
      HOME_CONTENT_DEFAULTS.heroEyebrow,
      120,
    ),
    heroTitle: cleanText(
      record.heroTitle,
      HOME_CONTENT_DEFAULTS.heroTitle,
      120,
    ),
    heroAccent: cleanText(
      record.heroAccent,
      HOME_CONTENT_DEFAULTS.heroAccent,
      120,
    ),
    heroBody: cleanText(record.heroBody, HOME_CONTENT_DEFAULTS.heroBody, 500),
    heroImageUrl: cleanUrl(
      record.heroImageUrl,
      HOME_CONTENT_DEFAULTS.heroImageUrl,
    ),
    aboutEyebrow: cleanText(
      record.aboutEyebrow,
      HOME_CONTENT_DEFAULTS.aboutEyebrow,
      120,
    ),
    aboutTitle: cleanText(
      record.aboutTitle,
      HOME_CONTENT_DEFAULTS.aboutTitle,
      180,
    ),
    aboutBodyOne: cleanText(
      record.aboutBodyOne,
      HOME_CONTENT_DEFAULTS.aboutBodyOne,
      900,
    ),
    aboutBodyTwo: cleanText(
      record.aboutBodyTwo,
      HOME_CONTENT_DEFAULTS.aboutBodyTwo,
      900,
    ),
    aboutImageUrl: cleanUrl(
      record.aboutImageUrl,
      HOME_CONTENT_DEFAULTS.aboutImageUrl,
    ),
    programsEyebrow: cleanText(
      record.programsEyebrow,
      HOME_CONTENT_DEFAULTS.programsEyebrow,
      120,
    ),
    programsTitle: cleanText(
      record.programsTitle,
      HOME_CONTENT_DEFAULTS.programsTitle,
      180,
    ),
    programsBody: cleanText(
      record.programsBody,
      HOME_CONTENT_DEFAULTS.programsBody,
      700,
    ),
    programImageUrl: cleanUrl(
      record.programImageUrl,
      HOME_CONTENT_DEFAULTS.programImageUrl,
    ),
    finalCtaTitle: cleanText(
      record.finalCtaTitle,
      HOME_CONTENT_DEFAULTS.finalCtaTitle,
      180,
    ),
    finalCtaBody: cleanText(
      record.finalCtaBody,
      HOME_CONTENT_DEFAULTS.finalCtaBody,
      500,
    ),
    upcomingShow:
      record.upcomingShow === "true" || record.upcomingShow === "on"
        ? "true"
        : "false",
    upcomingProgram: cleanText(record.upcomingProgram, "", 120),
    upcomingStartAt: cleanText(record.upcomingStartAt, "", 20),
    upcomingStatus: cleanText(record.upcomingStatus, "", 20),
    upcomingCapacity: cleanText(record.upcomingCapacity, "", 10),
    upcomingCtaUrl: cleanUrl(record.upcomingCtaUrl, ""),
  } satisfies HomePageContent;
}

export async function getHomePageContent(): Promise<HomePageContent> {
  const row = await prisma.siteContent.findUnique({
    where: { key: "homepage" },
    select: { content: true },
  });
  return parseHomePageContent(row?.content);
}
