// The JSON envelope every `/api/*` route returns. `@devmentor/core` declares
// the same shape on the server side; `ui` must not import `core`.
export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: ApiErrorBody };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
