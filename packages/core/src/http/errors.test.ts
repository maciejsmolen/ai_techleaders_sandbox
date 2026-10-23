import { describe, expect, it } from "vitest";

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

describe("AppError subclasses", () => {
  it.each([
    [ValidationError, "validation_error", 422, "The request is invalid."],
    [UnauthorizedError, "unauthorized", 401, "Authentication is required."],
    [ForbiddenError, "forbidden", 403, "You are not allowed to do this."],
    [NotFoundError, "not_found", 404, "The resource was not found."],
    [ConflictError, "conflict", 409, "The request conflicts with the current state."],
    [ServiceUnavailableError, "service_unavailable", 503, "The service is temporarily unavailable."],
  ])("%o has its code, status, default message and an explicit name", (ErrorClass, code, status, message) => {
    const error = new ErrorClass();

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code, status, message, name: ErrorClass.name });
  });

  it("keeps a custom message, field errors and the cause", () => {
    const cause = new Error("unique violation");
    const error = new ConflictError("The slot is taken.", { fieldErrors: { slotId: ["Taken"] }, cause });

    expect(error).toMatchObject({ message: "The slot is taken.", fieldErrors: { slotId: ["Taken"] }, cause });
  });

  it("AppError itself can carry any code and status", () => {
    expect(new AppError("payment_required", 402, "Pay first.")).toMatchObject({
      name: "AppError",
      code: "payment_required",
      status: 402,
      fieldErrors: undefined,
    });
  });
});
