import type { z } from "zod";

import { toFieldErrors } from "./apiHandler";
import { ValidationError } from "./errors";

/**
 * Validates `input` against `schema` and returns only the parsed output.
 * Object schemas strip unknown keys, so callers can't mass-assign fields
 * like `id` or `status`.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(undefined, { fieldErrors: toFieldErrors(result.error) });
  }
  return result.data;
}

/** Reads the JSON body and validates it; throws `ValidationError` on either failure. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError("The request body must be valid JSON.", { cause: error });
  }
  return parseInput(schema, body);
}
