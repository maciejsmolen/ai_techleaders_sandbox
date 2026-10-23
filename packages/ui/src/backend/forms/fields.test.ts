import { describe, expect, it } from "vitest";
import { z } from "zod";

import { deriveFields, humanize, initialFormValues, issuesToFieldErrors, toSchemaInput } from "./fields";

const schema = z.object({
  firstName: z.string().min(1),
  email: z.email().meta({ title: "E-mail", description: "We never share it." }),
  age: z.number().int().optional(),
  role: z.enum(["student", "mentor"]),
  newsletter: z.boolean().default(false),
});

describe("deriveFields", () => {
  it("infers kind, label, description and optionality from the schema", () => {
    expect(deriveFields(schema)).toEqual([
      { name: "firstName", label: "First name", description: undefined, optional: false, kind: "text" },
      { name: "email", label: "E-mail", description: "We never share it.", optional: false, kind: "email" },
      { name: "age", label: "Age", description: undefined, optional: true, kind: "number" },
      {
        name: "role",
        label: "Role",
        description: undefined,
        optional: false,
        kind: "select",
        options: [
          { value: "student", label: "Student" },
          { value: "mentor", label: "Mentor" },
        ],
      },
      { name: "newsletter", label: "Newsletter", description: undefined, optional: true, kind: "checkbox" },
    ]);
  });

  it("applies overrides", () => {
    const [firstName] = deriveFields(schema, { firstName: { label: "Given name", placeholder: "Ada" } });

    expect(firstName).toMatchObject({ label: "Given name", placeholder: "Ada", kind: "text" });
  });
});

describe("form values", () => {
  const fields = deriveFields(schema);

  it("starts from initial values, as strings and booleans", () => {
    expect(initialFormValues(fields, { firstName: "Ada", age: 36, newsletter: true })).toEqual({
      firstName: "Ada",
      email: "",
      age: "36",
      role: "",
      newsletter: true,
    });
  });

  it("converts numbers and omits blank optional fields", () => {
    const values = { firstName: "Ada", email: "ada@example.com", age: "", role: "mentor", newsletter: false };

    expect(toSchemaInput(fields, values)).toEqual({
      firstName: "Ada",
      email: "ada@example.com",
      role: "mentor",
      newsletter: false,
    });
    expect(toSchemaInput(fields, { ...values, age: "36" })).toMatchObject({ age: 36 });
  });
});

describe("helpers", () => {
  it("humanize turns keys into labels", () => {
    expect(humanize("hourlyRate")).toBe("Hourly rate");
    expect(humanize("created_at")).toBe("Created at");
  });

  it("issuesToFieldErrors groups messages by path", () => {
    const result = schema.safeParse({ firstName: "", email: "nope", role: "admin" });

    expect(Object.keys(issuesToFieldErrors(result.error!)).sort()).toEqual(["email", "firstName", "role"]);
  });
});
