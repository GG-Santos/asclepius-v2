"use client";

import { Award, IdCard } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Certificate } from "@/components/verify/certificate";
import { LicenseCard } from "@/components/verify/license-card";

// The reference LcnViewer left column: portrait photo, "View Certificate" /
// "View Identity" actions, and a QR. Rendered inside the credential card's
// left rail, so no card wrapper here.
export function CredentialArtifacts({
  name,
  lcn,
  issued,
  expiration,
  photoUrl,
  qrDataUrl,
}: {
  name: string;
  lcn: string;
  issued: string | null;
  expiration: string | null;
  photoUrl: string | null;
  qrDataUrl: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-highest">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="320px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
            No photo on file
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Dialog>
          <DialogTrigger className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-outline-variant bg-card text-sm font-semibold text-on-surface transition-colors hover:bg-primary hover:text-on-primary">
            <Award className="size-4" aria-hidden /> View Certificate
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Certificate of Completion</DialogTitle>
            </DialogHeader>
            <Certificate
              name={name}
              lcn={lcn}
              issued={issued}
              photoUrl={photoUrl}
            />
            <p className="text-[10px] text-on-surface-variant">
              Issued for digital verification only. Not valid unless printed
              with the authorized signature and official seal of the issuing
              institution.
            </p>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-outline-variant bg-card text-sm font-semibold text-on-surface transition-colors hover:bg-primary hover:text-on-primary">
            <IdCard className="size-4" aria-hidden /> View Identity
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>License Card</DialogTitle>
            </DialogHeader>
            <LicenseCard
              name={name}
              lcn={lcn}
              issued={issued}
              expiration={expiration}
              photoUrl={photoUrl}
              expired={false}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-surface-low p-3">
        {/* biome-ignore lint/performance/noImgElement: QR is a generated data-URL */}
        <img
          src={qrDataUrl}
          alt={`QR code linking to verification for ${lcn}`}
          width={64}
          height={64}
          className="rounded bg-white p-1"
        />
        <p className="text-xs text-on-surface-variant">
          Scan to open this verification page on another device.
        </p>
      </div>
    </div>
  );
}
