import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import * as loggerModule from "../logger";
import { apiHandler, toFieldErrors } from "./apiHandler";
import { NotFoundError, ServiceUnavailableError, ValidationError } from "./errors";

const request = () => new Request("http://localhost/api/things?token=secret");

function spyOnLogger() {
  const error = vi.fn();
  vi.spyOn(loggerModule, "getLogger").mockReturnValue({ error } as unknown as loggerModule.Logger);
  return error;
}

describe("apiHandler", () => {
  it("wraps the return value in the success envelope", async () => {
    const response = await apiHandler(() => ({ id: 1 }))(request(), undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { id: 1 } });
  });

  it("uses the configured success status", async () => {
    const response = await apiHandler(async () => "created", { status: 201 })(request(), undefined);

    expect(response.status).toBe(201);
  });

  it("maps an AppError to its status and code without logging it", async () => {
    const log = spyOnLogger();
    const response = await apiHandler(() => {
      throw new NotFoundError("No such thing.");
    })(request(), undefined);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "not_found", message: "No such thing." },
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("includes field errors from a ValidationError", async () => {
    const response = await apiHandler(() => {
      throw new ValidationError(undefined, { fieldErrors: { email: ["Invalid email"] } });
    })(request(), undefined);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation_error", fieldErrors: { email: ["Invalid email"] } },
    });
  });

  it("maps a ZodError to 422 with field errors", async () => {
    const response = await apiHandler(() => z.object({ name: z.string() }).parse({}))(request(), undefined);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "validation_error", fieldErrors: { name: [expect.any(String)] } },
    });
  });

  it("logs a 5xx AppError and still returns its envelope", async () => {
    const log = spyOnLogger();
    const response = await apiHandler(() => {
      throw new ServiceUnavailableError("The database is unreachable.");
    })(request(), undefined);

    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledOnce();
  });

  it("logs an unexpected error and returns a 500 without its details", async () => {
    const log = spyOnLogger();
    const response = await apiHandler(() => {
      throw new Error("connection string postgres://user:pw@db leaked");
    })(request(), undefined);

    expect(response.status).toBe(500);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      ok: false,
      error: { code: "internal_error", message: "Something went wrong." },
    });
    expect(body).not.toContain("postgres://");
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET", path: "/api/things" }),
      "Request failed",
    );
  });
});

describe("AppError names", () => {
  it("are explicit, so they survive minification", () => {
    expect(new ServiceUnavailableError().name).toBe("ServiceUnavailableError");
    expect(new ValidationError().name).toBe("ValidationError");
  });
});

describe("toFieldErrors", () => {
  it("joins nested paths and collects issues without a path under _form", () => {
    const schema = z
      .object({ address: z.object({ city: z.string() }) })
      .refine(() => false, { message: "Form-level problem" });
    const result = schema.safeParse({ address: {} });
    expect(result.success).toBe(false);

    const errors = toFieldErrors(result.error!);
    expect(Object.keys(errors)).toEqual(["address.city"]);

    const formLevel = schema.safeParse({ address: { city: "Gdańsk" } });
    expect(toFieldErrors(formLevel.error!)).toEqual({ _form: ["Form-level problem"] });
  });
});
