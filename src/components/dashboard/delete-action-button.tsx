"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ConfirmButton } from "@/components/dashboard/confirm-button";

/**
 * Trash-icon button that confirms before invoking a server action with `{ id }`.
 * Server actions are passed straight from server components as props. On success
 * it refreshes the route so the row disappears.
 */
export function DeleteActionButton({
  action,
  id,
  title = "Delete this item?",
  description,
  confirmLabel = "Delete",
  successMessage = "Deleted.",
  disabled,
}: {
  action: (fd: FormData) => Promise<unknown>;
  id: string;
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  successMessage?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      buttonTitle="Delete"
      className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary disabled:opacity-40"
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      successMessage={successMessage}
      disabled={disabled}
      onConfirm={async () => {
        const fd = new FormData();
        fd.set("id", id);
        const res = await action(fd);
        const error =
          res && typeof res === "object" && "error" in res
            ? (res as { error?: string }).error
            : undefined;
        if (!error) router.refresh();
        return res;
      }}
    >
      <Trash2 className="size-4" />
    </ConfirmButton>
  );
}
