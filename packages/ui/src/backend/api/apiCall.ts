import type { ApiErrorBody, ApiFailure, ApiResult } from "./types";

// Sent with every call. A plain HTML form post can't set it, so server-side
// CSRF checks can require it on state-changing routes.
export const CLIENT_HEADER = "x-requested-with";
export const CLIENT_HEADER_VALUE = "devmentor";

export type ApiCallInit = Omit<RequestInit, "body"> & {
  /** Serialized as JSON. */
  body?: unknown;
};

/** Thrown by `apiCallOrThrow`; carries the server's error envelope. */
export class ApiError extends Error {
  readonly code: string;
  readonly fieldErrors?: ApiErrorBody["fieldErrors"];

  constructor(error: ApiErrorBody) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.fieldErrors = error.fieldErrors;
  }
}

function failure(code: string, message: string): ApiFailure {
  return { ok: false, error: { code, message } };
}

/** The parsed JSON body, or `undefined` if it is empty or not JSON. Never throws. */
export async function readJsonSafe(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return undefined;
  }
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const { code, message } = value as Record<string, unknown>;
  return typeof code === "string" && typeof message === "string";
}

function isEnvelope<T>(value: unknown): value is ApiResult<T> {
  if (typeof value !== "object" || value === null) return false;
  const envelope = value as Record<string, unknown>;
  if (envelope.ok === true) return "data" in envelope;
  return envelope.ok === false && isErrorBody(envelope.error);
}

/**
 * The only sanctioned way to call `/api/*` from the client. Never throws:
 * network failures and malformed responses come back as `{ ok: false }`.
 */
export async function apiCall<T>(path: string, init: ApiCallInit = {}): Promise<ApiResult<T>> {
  const { body, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  headers.set(CLIENT_HEADER, CLIENT_HEADER_VALUE);
  headers.set("accept", "application/json");
  if (body !== undefined) headers.set("content-type", "application/json");

  let response: Response;
  try {
    response = await fetch(path, { ...rest, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    return failure("network_error", "Could not reach the server. Check your connection and try again.");
  }

  const payload = await readJsonSafe(response);
  if (isEnvelope<T>(payload)) return payload;
  return failure("invalid_response", `Unexpected response from the server (HTTP ${response.status}).`);
}

/** Like `apiCall`, but returns the data directly and throws `ApiError` on failure. */
export async function apiCallOrThrow<T>(path: string, init?: ApiCallInit): Promise<T> {
  const result = await apiCall<T>(path, init);
  if (!result.ok) throw new ApiError(result.error);
  return result.data;
}
