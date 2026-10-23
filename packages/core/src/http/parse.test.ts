import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ValidationError } from "./errors";
import { parseBody, parseInput } from "./parse";

const schema = z.object({ name: z.string().min(1) });

const jsonRequest = (body: string) =>
  new Request("http://localhost/api/things", { method: "POST", body, headers: { "content-type": "application/json" } });

describe("parseInput", () => {
  it("returns only the fields the schema declares (no mass assignment)", () => {
    expect(parseInput(schema, { name: "Ada", id: "attacker-chosen", status: "confirmed" })).toEqual({ name: "Ada" });
  });

  it("throws a ValidationError with field errors", () => {
    expect(() => parseInput(schema, { name: "" })).toThrow(ValidationError);
    try {
      parseInput(schema, { name: "" });
    } catch (error) {
      expect((error as ValidationError).fieldErrors).toEqual({ name: [expect.any(String)] });
    }
  });
});

describe("parseBody", () => {
  it("parses and validates a JSON body", async () => {
    await expect(parseBody(jsonRequest('{"name":"Ada"}'), schema)).resolves.toEqual({ name: "Ada" });
  });

  it("rejects a body that isn't JSON", async () => {
    await expect(parseBody(jsonRequest("not json"), schema)).rejects.toThrow("The request body must be valid JSON.");
  });
});
