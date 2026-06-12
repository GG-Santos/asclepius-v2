"use client";

import {
  Archive,
  ArchiveRestore,
  CalendarPlus,
  ChevronsUp,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteGraduate,
  renewGraduate,
  setGraduateStatus,
} from "@/app/dashboard/graduates/actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-button";
import { Button } from "@/components/ui/button";
import { yearsLabel, yearsNoun } from "@/lib/expiry-label";

// Every mutating action confirms through the same dialog before it applies.
type PendingAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "primary";
  run: () => void;
};

export function GraduateDetailActions({
  id,
  lcn,
  status,
  validityYears = 1,
}: {
  id: string;
  lcn: string;
  status: "STUDENT" | "GRADUATE" | "ARCHIVED";
  /** Org expiry policy: license validity period used in renewal copy. */
  validityYears?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<PendingAction | null>(null);

  function setStatus(next: "GRADUATE" | "ARCHIVED", msg: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", next);
    startTransition(async () => {
      await setGraduateStatus(fd);
      toast.success(msg);
      router.refresh();
    });
  }

  function renew() {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await renewGraduate(fd);
      toast.success(
        `Renewed ${lcn} — expiry extended ${yearsNoun(validityYears)}.`,
      );
      router.refresh();
    });
  }

  function remove() {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteGraduate(fd);
      toast.success(`Deleted ${lcn}`);
      router.push("/dashboard/graduates");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm">
        <Link href={`/dashboard/graduates/${id}/edit`}>
          <Pencil aria-hidden /> Edit
        </Link>
      </Button>

      {status === "STUDENT" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            setDialog({
              title: `Promote ${lcn} to graduate?`,
              description:
                "Marks this record as a graduate. It moves to the graduates registry and becomes publicly verifiable.",
              confirmLabel: "Promote",
              tone: "primary",
              run: () => setStatus("GRADUATE", `${lcn} promoted to graduate`),
            })
          }
        >
          <ChevronsUp aria-hidden /> Promote
        </Button>
      )}

      {status === "GRADUATE" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            setDialog({
              title: `Renew ${lcn}?`,
              description: `Extends the license ${yearsNoun(validityYears)} past its current expiry; the current expiry becomes the latest re-certification.`,
              confirmLabel: `Renew +${yearsLabel(validityYears)}`,
              tone: "primary",
              run: renew,
            })
          }
          className="border-success/30 bg-success/10 text-success hover:bg-success/20"
        >
          <CalendarPlus aria-hidden /> Renew +{yearsLabel(validityYears)}
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          status === "ARCHIVED"
            ? setDialog({
                title: `Restore ${lcn}?`,
                description:
                  "Moves the record back into the active graduates list.",
                confirmLabel: "Restore",
                tone: "primary",
                run: () => setStatus("GRADUATE", `Restored ${lcn}`),
              })
            : setDialog({
                title: `Archive ${lcn}?`,
                description:
                  "Moves the record out of the active list. You can restore it anytime.",
                confirmLabel: "Archive",
                tone: "primary",
                run: () => setStatus("ARCHIVED", `Archived ${lcn}`),
              })
        }
      >
        {status === "ARCHIVED" ? (
          <>
            <ArchiveRestore aria-hidden /> Restore
          </>
        ) : (
          <>
            <Archive aria-hidden /> Archive
          </>
        )}
      </Button>

      <Button asChild size="sm" variant="ghost">
        <Link href={`/verify/${encodeURIComponent(lcn)}`} target="_blank">
          <ExternalLink aria-hidden /> Public credential
        </Link>
      </Button>

      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          setDialog({
            title: `Delete record ${lcn}?`,
            description:
              "Permanently removes this record and its public credential. This cannot be undone.",
            confirmLabel: "Delete",
            tone: "danger",
            run: remove,
          })
        }
        className="text-secondary hover:bg-secondary/10 hover:text-secondary"
      >
        <Trash2 aria-hidden /> Delete
      </Button>

      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={dialog?.title}
        description={dialog?.description ?? ""}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
        pending={pending}
        onConfirm={() => {
          dialog?.run();
          setDialog(null);
        }}
      />
    </div>
  );
}
