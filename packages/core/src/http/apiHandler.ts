import { ZodError } from "zod";

import { getLogger } from "../logger";
import { AppError, type FieldErrors } from "./errors";

// The JSON envelope every route returns. `@devmentor/ui` declares the same
// shape separately (`ui` must not import `core`).
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fieldErrors?: FieldErrors };
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type RouteHandler<Context> = (request: Request, context: Context) => Promise<Response>;

/** Zod issues → `{ "address.city": ["Required"] }`; issues without a path go under `_form`. */
export function toFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function failure(status: number, error: ApiFailure["error"]): Response {
  return Response.json({ ok: false, error } satisfies ApiFailure, { status });
}

function logServerError(request: Request, error: unknown): void {
  // The path only: query strings may carry tokens.
  const { pathname } = new URL(request.url);
  getLogger().error({ err: error, method: request.method, path: pathname }, "Request failed");
}

function toErrorResponse(request: Request, error: unknown): Response {
  if (error instanceof AppError) {
    if (error.status >= 500) logServerError(request, error);
    return failure(error.status, { code: error.code, message: error.message, fieldErrors: error.fieldErrors });
  }
  if (error instanceof ZodError) {
    return failure(422, {
      code: "validation_error",
      message: "The request is invalid.",
      fieldErrors: toFieldErrors(error),
    });
  }
  logServerError(request, error);
  return failure(500, { code: "internal_error", message: "Something went wrong." });
}

/**
 * Wraps a route function: its return value becomes `{ ok: true, data }`, a
 * thrown `AppError` becomes its status and `{ ok: false, error }`, and
 * anything else is logged and returned as a 500 without details. Routes
 * never write their own try/catch.
 */
export function apiHandler<T, Context = unknown>(
  fn: (request: Request, context: Context) => Promise<T> | T,
  options: { status?: number } = {},
): RouteHandler<Context> {
  return async (request, context) => {
    try {
      const data = await fn(request, context);
      return Response.json({ ok: true, data } satisfies ApiSuccess<T>, { status: options.status ?? 200 });
    } catch (error) {
      return toErrorResponse(request, error);
    }
  };
}
