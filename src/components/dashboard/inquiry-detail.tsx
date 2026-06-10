"use client";

import { Mail, MailCheck, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteInquiry,
  markInquiryReplied,
  setInquiryStatus,
  updateInquiryNotes,
} from "@/app/dashboard/inquiries/actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { Button } from "@/components/ui/button";

export type InquiryDetailData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  program: string | null;
  message: string | null;
  status: "NEW" | "CONTACTED" | "CLOSED";
  notes: string | null;
  repliedAt: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<InquiryDetailData["status"], string> = {
  NEW: "bg-accent/10 text-accent",
  CONTACTED: "bg-warning/10 text-warning",
  CLOSED: "bg-success/10 text-success",
};

function replyBody(r: InquiryDetailData): string {
  return `Hi ${r.name.split(" ")[0] || r.name},

Thank you for your interest in WSL EMS training${r.program ? ` — specifically our ${r.program} program` : ""}. We'd be glad to help you get started.

Here are the next steps:
• Program schedule and tuition details are below.
• To reserve a slot, reply to this email or call us.

If you have any questions, just reply here.

Warm regards,
WSL EMS Admissions`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-on-surface">{value}</p>
    </div>
  );
}

export function InquiryDetail({ inquiry }: { inquiry: InquiryDetailData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(inquiry.notes ?? "");

  function changeStatus(status: InquiryDetailData["status"]) {
    const fd = new FormData();
    fd.set("id", inquiry.id);
    fd.set("status", status);
    startTransition(async () => {
      await setInquiryStatus(fd);
      router.refresh();
    });
  }

  function reply() {
    const subject = encodeURIComponent("Your WSL EMS training inquiry");
    const body = encodeURIComponent(replyBody(inquiry));
    window.open(
      `mailto:${inquiry.email}?subject=${subject}&body=${body}`,
      "_blank",
    );
    const fd = new FormData();
    fd.set("id", inquiry.id);
    startTransition(async () => {
      await markInquiryReplied(fd);
      toast.success("Reply drafted.");
      router.refresh();
    });
  }

  function saveNotes() {
    const fd = new FormData();
    fd.set("id", inquiry.id);
    fd.set("notes", notes);
    startTransition(async () => {
      await updateInquiryNotes(fd);
      toast.success("Notes saved.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-6">
        <div className="rounded-xl border border-outline-variant/60 bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              value={
                <a
                  href={`mailto:${inquiry.email}`}
                  className="hover:text-accent"
                >
                  {inquiry.email}
                </a>
              }
            />
            <Field label="Phone" value={inquiry.phone ?? "—"} />
            <Field label="Program" value={inquiry.program ?? "—"} />
            <Field
              label="Received"
              value={new Date(inquiry.createdAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            />
          </div>
          {inquiry.message && (
            <div className="mt-4 border-t border-outline-variant/60 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                Message
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface">
                {inquiry.message}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-outline-variant/60 bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-on-surface">
              Internal notes
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={saveNotes}
              disabled={pending}
            >
              <Save aria-hidden /> Save
            </Button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add a note for your team…"
            className="mt-3 w-full rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-outline-variant/60 bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            Status
          </p>
          <select
            value={inquiry.status}
            disabled={pending}
            onChange={(e) =>
              changeStatus(e.target.value as InquiryDetailData["status"])
            }
            className={`mt-2 h-9 w-full rounded-full border-0 px-3 text-xs font-semibold disabled:opacity-60 ${STATUS_STYLE[inquiry.status]}`}
          >
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="CLOSED">Closed</option>
          </select>
          {inquiry.repliedAt && (
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-on-surface-variant">
              <MailCheck className="size-3.5" /> Replied{" "}
              {new Date(inquiry.repliedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        <Button className="w-full" onClick={reply} disabled={pending}>
          <Mail aria-hidden /> Draft reply email
        </Button>

        <ConfirmButton
          buttonTitle="Delete"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-secondary/40 px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary/10"
          title={`Delete inquiry from ${inquiry.name}?`}
          description="This permanently removes the inquiry. This cannot be undone."
          successMessage="Inquiry deleted."
          onConfirm={async () => {
            const fd = new FormData();
            fd.set("id", inquiry.id);
            const res = await deleteInquiry(fd);
            if (!(res && "error" in res && res.error)) {
              router.push("/dashboard/inquiries");
            }
            return res;
          }}
        >
          <Trash2 className="size-4" /> Delete inquiry
        </ConfirmButton>
      </div>
    </div>
  );
}
