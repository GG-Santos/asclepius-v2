import type { Metadata } from "next";
import { EnrollForm } from "@/components/enroll-form";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Apply for EMS Training",
  description:
    "Request information and reserve a seat in an upcoming WSL EMS training cohort — Basic EMT, Emergency Medical Responder, or Basic Life Support.",
};

export default function EnrollPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader verifyHref="/#verify" />

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-[1000px] gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Admissions
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
              Train to become an EMT.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
              Tell us which program you&apos;re interested in and WSL EMS
              admissions will reach out with the next intake schedule, seat
              availability, and requirements.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-on-surface-variant">
              <li>· ASHI-accredited programs</li>
              <li>· Written, practical, and supervised clinical evaluation</li>
              <li>· Graduates listed in the public WSL EMS registry</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface p-6 shadow-clinical md:p-8">
            <EnrollForm />
          </div>
        </div>
      </main>
    </div>
  );
}
