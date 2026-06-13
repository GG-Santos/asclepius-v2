"use client";

import Link from "next/link";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { PasswordForm } from "@/components/account/password-form";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Role } from "@/lib/auth";

export function AccountSettingsDialog({
  open,
  onOpenChange,
  name,
  email,
  role,
  image,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  role: Role;
  image?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account settings</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <span className="font-medium text-on-surface">{name}</span>
            <span>{email}</span>
            <Badge variant="neutral" className="capitalize">
              {role}
            </Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <AvatarUpload name={name} currentUrl={image ?? null} />
          <PasswordForm />
          <Link
            href="/dashboard/settings"
            onClick={() => onOpenChange(false)}
            className="inline-flex text-sm font-semibold text-accent hover:text-primary dark:hover:text-accent-bright"
          >
            Open full settings page
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
