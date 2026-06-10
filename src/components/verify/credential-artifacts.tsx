"use client";

import { Award, FlipHorizontal2, IdCard, PenLine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { CometCard } from "@/components/ui/comet-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Certificate,
  type SignatureSlot,
  type SignatureVisibility,
} from "@/components/verify/certificate";
import { DownloadArtifactButton } from "@/components/verify/download-artifact-button";
import { LicenseCard } from "@/components/verify/license-card";
import { LicenseCardBack } from "@/components/verify/license-card-back";
import { ProtectedArtifact } from "@/components/verify/protected-artifact";
import { cn } from "@/lib/utils";

const SIGNATURE_SLOTS: { slot: SignatureSlot; label: string }[] = [
  { slot: "one", label: "Signature 1" },
  { slot: "two", label: "Signature 2" },
  { slot: "three", label: "Signature 3" },
];

// Print-grade export widths: certificate ≈ letter/short-bond landscape
// @300dpi; ID ≈ ISO ID-1 (ATM card) width @600dpi.
const CERT_EXPORT_WIDTH = 3300;
const ID_EXPORT_WIDTH = 2022;

// 3D card flip. BOTH faces stay mounted (hidden via backface-visibility, not
// display) so the PNG exporters always have a laid-out node to rasterize —
// the refs live inside the faces, below the rotated wrappers, keeping the
// cloned export subtree free of flip transforms.
function FlipCard({
  flipped,
  front,
  back,
}: {
  flipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
}) {
  return (
    <div style={{ perspective: "2400px" }}>
      <div
        className={cn(
          "relative w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none",
          flipped && "[transform:rotateY(180deg)]",
        )}
        style={{ aspectRatio: "3450 / 2210" }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          {front}
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </div>
  );
}

function FlipButton({
  flipped,
  onFlip,
  floating = false,
}: {
  flipped: boolean;
  onFlip: () => void;
  floating?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-outline-variant bg-card px-2.5 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/[0.1]",
        floating && "rounded-full bg-card/90 px-3 shadow-md backdrop-blur",
      )}
    >
      <FlipHorizontal2 className="size-3.5" aria-hidden />
      {flipped ? "Show front" : "Show back"}
    </button>
  );
}

// Admin chip toggling one ink-signature layer on a print artifact.
function ToggleChip({
  on,
  label,
  onToggle,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        on
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-outline-variant text-on-surface-variant line-through opacity-70 hover:opacity-100 dark:border-white/[0.1]",
      )}
    >
      <PenLine className="size-3" aria-hidden />
      {label}
    </button>
  );
}

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
  certQrDataUrl = null,
  downloadable = false,
  photoDataUrl = null,
  batch = null,
}: {
  name: string;
  lcn: string;
  issued: string | null;
  expiration: string | null;
  photoUrl: string | null;
  qrDataUrl: string;
  /** Artwork-embedded QR (#0d1671, ECC-H for the center logo overlays). */
  certQrDataUrl?: string | null;
  /** Admin-only: show PNG download actions inside the dialogs. */
  downloadable?: boolean;
  /** Server-inlined photo (data URI) so PNG export never taints the canvas. */
  photoDataUrl?: string | null;
  /** Cohort crest (public rail only) — links to the cohort page. */
  batch?: {
    id: string;
    code: string;
    label: string | null;
    logoUrl: string | null;
  } | null;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  // Admin: per-signature visibility for preview + download (all on by default).
  const [signatures, setSignatures] = useState<SignatureVisibility>({
    one: true,
    two: true,
    three: true,
  });
  const [idSignatures, setIdSignatures] = useState({
    front: true,
    backOne: true,
    backTwo: true,
  });
  const [idFlipped, setIdFlipped] = useState(false);
  // Exports rasterize the displayed node — feed it the inlined photo when
  // downloads are enabled so the canvas stays clean cross-origin.
  const cardPhoto = downloadable ? (photoDataUrl ?? photoUrl) : photoUrl;
  // The ID back's QR sits under the design's logo layer — needs the ECC-H QR.
  const backQrDataUrl = certQrDataUrl ?? qrDataUrl;
  return (
    <div className="flex flex-col gap-4">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: suppressing the context menu on the public portrait, not adding interaction */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-highest dark:border-white/[0.08] dark:bg-surface-low"
        onContextMenu={downloadable ? undefined : (e) => e.preventDefault()}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            fill
            draggable={false}
            className={cn(
              "object-cover",
              !downloadable && "select-none [-webkit-touch-callout:none]",
            )}
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
          <DialogTrigger className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-outline-variant bg-card text-sm font-semibold text-on-surface transition-colors hover:bg-primary hover:text-on-primary dark:border-white/[0.1] dark:hover:border-accent/50 dark:hover:bg-accent/[0.08] dark:hover:text-accent">
            <Award className="size-4" aria-hidden /> View Certificate
          </DialogTrigger>
          <DialogContent bare={!downloadable} className="max-w-3xl">
            {downloadable ? (
              <DialogHeader>
                <DialogTitle>Certificate of Completion</DialogTitle>
              </DialogHeader>
            ) : (
              <DialogTitle className="sr-only">
                Certificate of Completion
              </DialogTitle>
            )}
            {downloadable ? (
              <>
                <div ref={certRef}>
                  <Certificate
                    name={name}
                    lcn={lcn}
                    issued={issued}
                    photoUrl={cardPhoto}
                    qrDataUrl={certQrDataUrl}
                    signatures={signatures}
                    frameless
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {SIGNATURE_SLOTS.map(({ slot, label }) => {
                      const on = Boolean(signatures[slot]);
                      return (
                        <ToggleChip
                          key={slot}
                          on={on}
                          label={label}
                          onToggle={() =>
                            setSignatures((s) => ({ ...s, [slot]: !on }))
                          }
                        />
                      );
                    })}
                  </div>
                  <DownloadArtifactButton
                    targetRef={certRef}
                    filename={`${lcn}-certificate.png`}
                    targetWidth={CERT_EXPORT_WIDTH}
                  />
                </div>
              </>
            ) : (
              <CometCard>
                <ProtectedArtifact>
                  <Certificate
                    name={name}
                    lcn={lcn}
                    issued={issued}
                    photoUrl={cardPhoto}
                    qrDataUrl={certQrDataUrl}
                    warningOverlay
                  />
                </ProtectedArtifact>
              </CometCard>
            )}
            {downloadable && (
              <p className="text-[10px] text-on-surface-variant">
                Issued for digital verification only. Not valid unless printed
                with the authorized signature and official seal of the issuing
                institution.
              </p>
            )}
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-outline-variant bg-card text-sm font-semibold text-on-surface transition-colors hover:bg-primary hover:text-on-primary dark:border-white/[0.1] dark:hover:border-accent/50 dark:hover:bg-accent/[0.08] dark:hover:text-accent">
            <IdCard className="size-4" aria-hidden /> View Identity
          </DialogTrigger>
          <DialogContent bare={!downloadable} className="max-w-xl">
            {downloadable ? (
              <DialogHeader>
                <DialogTitle>License Card</DialogTitle>
              </DialogHeader>
            ) : (
              <DialogTitle className="sr-only">License Card</DialogTitle>
            )}
            {downloadable ? (
              <>
                <FlipCard
                  flipped={idFlipped}
                  front={
                    <div ref={frontRef}>
                      <LicenseCard
                        name={name}
                        lcn={lcn}
                        issued={issued}
                        expiration={expiration}
                        photoUrl={cardPhoto}
                        signature={idSignatures.front}
                        frameless
                      />
                    </div>
                  }
                  back={
                    <div ref={backRef}>
                      <LicenseCardBack
                        qrDataUrl={backQrDataUrl}
                        signatures={{
                          one: idSignatures.backOne,
                          two: idSignatures.backTwo,
                        }}
                        frameless
                      />
                    </div>
                  }
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <FlipButton
                      flipped={idFlipped}
                      onFlip={() => setIdFlipped((f) => !f)}
                    />
                    {idFlipped ? (
                      <>
                        <ToggleChip
                          on={idSignatures.backOne}
                          label="Signature 1"
                          onToggle={() =>
                            setIdSignatures((s) => ({
                              ...s,
                              backOne: !s.backOne,
                            }))
                          }
                        />
                        <ToggleChip
                          on={idSignatures.backTwo}
                          label="Signature 2"
                          onToggle={() =>
                            setIdSignatures((s) => ({
                              ...s,
                              backTwo: !s.backTwo,
                            }))
                          }
                        />
                      </>
                    ) : (
                      <ToggleChip
                        on={idSignatures.front}
                        label="Signature"
                        onToggle={() =>
                          setIdSignatures((s) => ({ ...s, front: !s.front }))
                        }
                      />
                    )}
                  </div>
                  {idFlipped ? (
                    <DownloadArtifactButton
                      targetRef={backRef}
                      filename={`${lcn}-id-back.png`}
                      targetWidth={ID_EXPORT_WIDTH}
                      label="Download back PNG"
                    />
                  ) : (
                    <DownloadArtifactButton
                      targetRef={frontRef}
                      filename={`${lcn}-id-front.png`}
                      targetWidth={ID_EXPORT_WIDTH}
                      label="Download front PNG"
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <CometCard>
                  <ProtectedArtifact>
                    <FlipCard
                      flipped={idFlipped}
                      front={
                        <LicenseCard
                          name={name}
                          lcn={lcn}
                          issued={issued}
                          expiration={expiration}
                          photoUrl={cardPhoto}
                          warningOverlay
                        />
                      }
                      back={<LicenseCardBack qrDataUrl={backQrDataUrl} />}
                    />
                  </ProtectedArtifact>
                </CometCard>
                <div className="mt-3 flex justify-center">
                  <FlipButton
                    flipped={idFlipped}
                    onFlip={() => setIdFlipped((f) => !f)}
                    floating
                  />
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Cohort crest — public trust context where the QR box used to live. */}
        {!downloadable && batch?.logoUrl && (
          <Link
            href={`/cohorts/${batch.id}`}
            className="group mt-1 flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-surface-low p-3 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/[0.07] dark:bg-white/[0.02]"
          >
            {/* biome-ignore lint/performance/noImgElement: admin-uploaded blob logo on an arbitrary domain */}
            <img
              src={batch.logoUrl}
              alt={`${batch.code} cohort crest`}
              className="size-14 shrink-0 rounded-lg border border-outline-variant/60 bg-white object-contain p-1"
            />
            <span className="min-w-0">
              <span className="block text-label-caps text-on-surface-variant">
                Trained with cohort
              </span>
              <span className="block truncate text-sm font-semibold text-on-surface group-hover:text-accent">
                {batch.label ?? batch.code}
              </span>
              <span className="tabular block font-mono text-xs text-on-surface-variant">
                {batch.code}
              </span>
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
