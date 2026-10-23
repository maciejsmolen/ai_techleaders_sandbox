/** Field path → messages, as shown next to form fields. */
export type FieldErrors = Record<string, string[]>;

export interface AppErrorOptions {
  fieldErrors?: FieldErrors;
  /** The underlying error; logged, never sent to the client. */
  cause?: unknown;
}

/**
 * Base class for every error a service may throw. `apiHandler` maps it to
 * `status` and the `{ ok: false, error }` envelope; services never build
 * HTTP responses themselves.
 */
export class AppError extends Error {
  // Set explicitly in every class: minified production builds drop class names.
  override name = "AppError";
  readonly fieldErrors?: FieldErrors;

  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.fieldErrors = options.fieldErrors;
  }
}

export class ValidationError extends AppError {
  override name = "ValidationError";

  constructor(message = "The request is invalid.", options?: AppErrorOptions) {
    super("validation_error", 422, message, options);
  }
}

export class UnauthorizedError extends AppError {
  override name = "UnauthorizedError";

  constructor(message = "Authentication is required.", options?: AppErrorOptions) {
    super("unauthorized", 401, message, options);
  }
}

export class ForbiddenError extends AppError {
  override name = "ForbiddenError";

  constructor(message = "You are not allowed to do this.", options?: AppErrorOptions) {
    super("forbidden", 403, message, options);
  }
}

export class NotFoundError extends AppError {
  override name = "NotFoundError";

  constructor(message = "The resource was not found.", options?: AppErrorOptions) {
    super("not_found", 404, message, options);
  }
}

export class ConflictError extends AppError {
  override name = "ConflictError";

  constructor(message = "The request conflicts with the current state.", options?: AppErrorOptions) {
    super("conflict", 409, message, options);
  }
}

/** A dependency (e.g. the database) is down; the request may succeed later. */
export class ServiceUnavailableError extends AppError {
  override name = "ServiceUnavailableError";

  constructor(message = "The service is temporarily unavailable.", options?: AppErrorOptions) {
    super("service_unavailable", 503, message, options);
  }
}
