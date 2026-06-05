"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronsUp,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  deleteGraduate,
  setGraduateStatus,
} from "@/app/dashboard/graduates/actions";
import { Button } from "@/components/ui/button";

export function GraduateDetailActions({
  id,
  lcn,
  status,
}: {
  id: string;
  lcn: string;
  status: "STUDENT" | "GRADUATE" | "ARCHIVED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  function remove() {
    if (!confirm(`Delete record ${lcn}? This cannot be undone.`)) return;
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
          onClick={() => setStatus("GRADUATE", `${lcn} promoted to graduate`)}
        >
          <ChevronsUp aria-hidden /> Promote
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          status === "ARCHIVED"
            ? setStatus("GRADUATE", `Restored ${lcn}`)
            : setStatus("ARCHIVED", `Archived ${lcn}`)
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
        onClick={remove}
        className="text-secondary hover:bg-secondary/10 hover:text-secondary"
      >
        <Trash2 aria-hidden /> Delete
      </Button>
    </div>
  );
}
