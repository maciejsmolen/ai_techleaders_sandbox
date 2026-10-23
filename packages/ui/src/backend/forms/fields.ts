import type { z } from "zod";

import type { FieldErrors } from "../api/types";

export type FieldKind = "text" | "email" | "password" | "number" | "checkbox" | "select";

export interface FormField {
  name: string;
  label: string;
  kind: FieldKind;
  /** Optional fields send `undefined` instead of an empty string. */
  optional: boolean;
  description?: string;
  placeholder?: string;
  /** For `select`. */
  options?: { value: string; label: string }[];
}

/** Per-field overrides of what `deriveFields` infers from the schema. */
export type FieldOverrides = Record<string, Partial<Omit<FormField, "name">>>;

/** Form state: strings for inputs and selects, booleans for checkboxes. */
export type FormValues = Record<string, string | boolean>;

// Wrappers whose inner schema decides the input type.
const wrapperTypes = new Set(["optional", "nullable", "default", "prefault", "readonly"]);

function unwrap(schema: z.ZodType): z.ZodType {
  let current = schema;
  while (wrapperTypes.has(current.def.type)) {
    current = (current.def as unknown as { innerType: z.ZodType }).innerType;
  }
  return current;
}

/** `firstName` → "First name". */
export function humanize(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function kindOf(schema: z.ZodType): Pick<FormField, "kind" | "options"> {
  switch (schema.def.type) {
    case "number":
      return { kind: "number" };
    case "boolean":
      return { kind: "checkbox" };
    case "enum": {
      const values = (schema as z.ZodEnum).options.map(String);
      return { kind: "select", options: values.map((value) => ({ value, label: humanize(value) })) };
    }
    case "string":
      return { kind: (schema as z.ZodString).format === "email" ? "email" : "text" };
    default:
      return { kind: "text" };
  }
}

/**
 * One field per key of the object schema, in declaration order. The label
 * comes from `.meta({ title })`, the help text from `.meta({ description })`.
 */
export function deriveFields(schema: z.ZodObject, overrides: FieldOverrides = {}): FormField[] {
  return Object.entries(schema.shape).map(([name, fieldSchema]) => {
    const inner = unwrap(fieldSchema);
    const meta = fieldSchema.meta() ?? inner.meta();
    return {
      name,
      label: meta?.title ?? humanize(name),
      description: meta?.description,
      optional: fieldSchema.isOptional(),
      ...kindOf(inner),
      ...overrides[name],
    };
  });
}

export function initialFormValues(fields: FormField[], initial: Record<string, unknown> = {}): FormValues {
  return Object.fromEntries(
    fields.map((field) => {
      const value = initial[field.name];
      if (field.kind === "checkbox") return [field.name, value === true];
      return [field.name, value === undefined || value === null ? "" : String(value)];
    }),
  );
}

/** Form state → the input the schema parses (numbers as numbers, blank optionals omitted). */
export function toSchemaInput(fields: FormField[], values: FormValues): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (typeof value === "boolean") {
      input[field.name] = value;
      continue;
    }
    if (value === "" && field.optional) continue;
    input[field.name] = field.kind === "number" && value !== "" ? Number(value) : value;
  }
  return input;
}

/** Zod issues → `{ field: [messages] }`; issues without a path go under `_form`. */
export function issuesToFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
