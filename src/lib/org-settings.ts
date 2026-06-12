// Org settings readers — singleton settings document (key "org") holding the
// expiry policy and the active artifact-template pointer.
//
// Cache mechanism: request-scoped React cache(). Every request re-reads from
// the DB (the public verify page is force-dynamic), so a saved template or
// policy change is live on the next request with no invalidation step —
// matching the confirmed live-render model.
import "server-only";
import { cache } from "react";
import {
  parseTemplateConfig,
  type ResolvedTemplate,
  resolveTemplate,
} from "@/lib/artifact-template/resolve";
import { DEFAULT_EXPIRY_POLICY, type ExpiryPolicy } from "@/lib/expiry-policy";
import { prisma } from "@/lib/prisma";

const ORG_KEY = "org";

export const getOrgSettings = cache(async () => {
  return prisma.orgSettings.findUnique({ where: { key: ORG_KEY } });
});

export const getExpiryPolicy = cache(async (): Promise<ExpiryPolicy> => {
  const settings = await getOrgSettings();
  if (!settings) return DEFAULT_EXPIRY_POLICY;
  return {
    licenseValidityYears: settings.licenseValidityYears,
    archiveGraceYears: settings.archiveGraceYears,
  };
});

/**
 * The active template, resolved. No settings row, no active version, or a
 * malformed config all resolve to the built-in defaults (R1 parity).
 */
export const getActiveTemplate = cache(async (): Promise<ResolvedTemplate> => {
  const settings = await getOrgSettings();
  if (!settings?.activeTemplateVersionId) return resolveTemplate(null);
  const version = await prisma.artifactTemplateVersion.findUnique({
    where: { id: settings.activeTemplateVersionId },
  });
  if (!version) return resolveTemplate(null);
  return resolveTemplate(parseTemplateConfig(version.config));
});

/** Upsert helper used by the settings actions (singleton row). */
export function orgSettingsWhere() {
  return { key: ORG_KEY } as const;
}
