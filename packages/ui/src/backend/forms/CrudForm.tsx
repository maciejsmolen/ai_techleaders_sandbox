"use client";

import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import type { z } from "zod";

import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { NativeSelect, NativeSelectOption } from "../../components/ui/native-select";
import type { ApiResult, FieldErrors } from "../api/types";
import {
  deriveFields,
  initialFormValues,
  issuesToFieldErrors,
  toSchemaInput,
  type FieldOverrides,
  type FormField,
  type FormValues,
} from "./fields";

export interface CrudFormProps<Schema extends z.ZodObject, Data> {
  /** The same schema the API route validates with. */
  schema: Schema;
  /** Submits the parsed values, usually through `apiCall`. Server field errors are shown next to their fields. */
  onSubmit: (values: z.output<Schema>) => Promise<ApiResult<Data>>;
  onSuccess?: (data: Data) => void;
  /** Shows a Cancel button; Escape triggers it too. */
  onCancel?: () => void;
  initialValues?: Partial<z.input<Schema>>;
  fields?: FieldOverrides;
  submitLabel?: string;
}

const FORM_ERROR_KEY = "_form";
const UNEXPECTED_ERROR = "Something went wrong. Please try again.";

/**
 * Schema-driven create/edit form. Validates on the client with the shared
 * schema before submitting. Cmd/Ctrl+Enter submits, Escape cancels.
 */
export function CrudForm<Schema extends z.ZodObject, Data>({
  schema,
  onSubmit,
  onSuccess,
  onCancel,
  initialValues,
  fields: overrides,
  submitLabel = "Save",
}: CrudFormProps<Schema, Data>) {
  const idPrefix = useId();
  const fields = useMemo(() => deriveFields(schema, overrides), [schema, overrides]);
  const [values, setValues] = useState<FormValues>(() => initialFormValues(fields, initialValues));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setValue(name: string, value: string | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsed = schema.safeParse(toSchemaInput(fields, values));
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error));
      setFormError(null);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const result = await onSubmit(parsed.data);
      if (result.ok) {
        onSuccess?.(result.data);
        return;
      }
      setErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
    } catch (error) {
      setFormError(error instanceof Error && error.message ? error.message : UNEXPECTED_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    } else if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  const formErrors = [...new Set([formError, ...(errors[FORM_ERROR_KEY] ?? [])])].filter(Boolean);

  return (
    <form noValidate onSubmit={submit} onKeyDown={handleKeyDown} className="flex max-w-lg flex-col gap-4">
      <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
        {fields.map((field) => (
          <FieldRow
            key={field.name}
            id={`${idPrefix}-${field.name}`}
            field={field}
            value={values[field.name]}
            errors={errors[field.name]}
            onChange={(value) => setValue(field.name, value)}
          />
        ))}
      </fieldset>
      {formErrors.length > 0 && (
        <div role="alert" className="text-sm text-destructive">
          {formErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function FieldRow({
  id,
  field,
  value,
  errors,
  onChange,
}: {
  id: string;
  field: FormField;
  value: string | boolean;
  errors?: string[];
  onChange: (value: string | boolean) => void;
}) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const describedBy = [field.description && descriptionId, errors && errorId].filter(Boolean).join(" ") || undefined;
  const invalid = errors ? true : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {field.kind === "checkbox" ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked)}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
          <Label htmlFor={id}>{field.label}</Label>
        </div>
      ) : (
        <>
          <Label htmlFor={id}>{field.label}</Label>
          {field.kind === "select" ? (
            <NativeSelect
              id={id}
              value={String(value)}
              onChange={(event) => onChange(event.target.value)}
              aria-invalid={invalid}
              aria-describedby={describedBy}
            >
              <NativeSelectOption value="">Select…</NativeSelectOption>
              {field.options?.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <Input
              id={id}
              type={field.kind}
              value={String(value)}
              placeholder={field.placeholder}
              onChange={(event) => onChange(event.target.value)}
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </>
      )}
      {field.description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {field.description}
        </p>
      )}
      {errors && (
        <p id={errorId} className="text-xs text-destructive">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}
