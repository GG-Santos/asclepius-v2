import "server-only";
import type { Prisma } from "@prisma/client";

export type PublicFormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "date";

export type PublicFormField = {
  id: string;
  label: string;
  type: PublicFormFieldType;
  required: boolean;
  options: string[];
};

const TYPES: PublicFormFieldType[] = [
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "date",
];

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function uniqueFields(fields: PublicFormField[]) {
  const seen = new Map<string, number>();
  return fields.map((field, index) => {
    const root =
      slugPart(field.id) || slugPart(field.label) || `field-${index + 1}`;
    const count = seen.get(root) ?? 0;
    seen.set(root, count + 1);
    return {
      ...field,
      id: count === 0 ? root : `${root}-${count + 1}`,
    };
  });
}

function text(value: unknown, fallback: string, max = 120) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

export function parsePublicFormFields(
  raw: Prisma.JsonValue | null | undefined,
): PublicFormField[] {
  if (!Array.isArray(raw)) return [];
  const fields = raw
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      const label = text(record.label, `Question ${index + 1}`, 120);
      const type = TYPES.includes(record.type as PublicFormFieldType)
        ? (record.type as PublicFormFieldType)
        : "text";
      const options =
        type === "select" && Array.isArray(record.options)
          ? record.options
              .filter((option): option is string => typeof option === "string")
              .map((option) => option.trim().slice(0, 80))
              .filter(Boolean)
              .slice(0, 12)
          : [];
      return {
        id: text(record.id, slugPart(label) || `field-${index + 1}`, 80),
        label,
        type,
        required: record.required === true,
        options,
      } satisfies PublicFormField;
    })
    .filter((item): item is PublicFormField => item !== null);
  return uniqueFields(fields);
}

export function fieldsToJson(
  fields: readonly PublicFormField[],
): Prisma.InputJsonValue {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options,
  }));
}

export function parseFieldsText(raw: string): PublicFormField[] {
  const fields = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [labelRaw, typeRaw = "text", requiredRaw = "", optionsRaw = ""] =
        line.split("|").map((part) => part.trim());
      const label = labelRaw || `Question ${index + 1}`;
      const type = TYPES.includes(typeRaw as PublicFormFieldType)
        ? (typeRaw as PublicFormFieldType)
        : "text";
      return {
        id: slugPart(label) || `field-${index + 1}`,
        label: label.slice(0, 120),
        type,
        required: /^(required|yes|true|1)$/i.test(requiredRaw),
        options:
          type === "select"
            ? optionsRaw
                .split(",")
                .map((option) => option.trim().slice(0, 80))
                .filter(Boolean)
                .slice(0, 12)
            : [],
      } satisfies PublicFormField;
    });
  return uniqueFields(fields);
}

export function fieldsToText(fields: readonly PublicFormField[]): string {
  return fields
    .map((field) =>
      [
        field.label,
        field.type,
        field.required ? "required" : "optional",
        field.options.join(", "),
      ].join(" | "),
    )
    .join("\n");
}
