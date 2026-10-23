import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ApiResult } from "../api/types";
import { CrudForm } from "./CrudForm";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid e-mail"),
  rate: z.number().positive().optional(),
  active: z.boolean().default(false),
});

type Values = z.output<typeof schema>;

type Submit = (values: Values) => Promise<ApiResult<{ id: string }>>;

function setup(submit: Submit = async () => ({ ok: true, data: { id: "1" } })) {
  const onSubmit = vi.fn(submit);
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(<CrudForm schema={schema} onSubmit={onSubmit} onSuccess={onSuccess} onCancel={onCancel} submitLabel="Create" />);
  return { user, onSubmit, onSuccess, onCancel };
}

describe("CrudForm", () => {
  it("submits the parsed values and calls onSuccess with the returned data", async () => {
    const { user, onSubmit, onSuccess } = setup();

    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Rate"), "120");
    await user.click(screen.getByRole("checkbox", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", email: "ada@example.com", rate: 120, active: true } satisfies Values);
    expect(onSuccess).toHaveBeenCalledWith({ id: "1" });
  });

  it("validates on the client first and shows errors next to the fields", async () => {
    const { user, onSubmit } = setup();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Name is required")).toBeDefined();
    expect(screen.getByText("Enter a valid e-mail")).toBeDefined();
    expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe("true");
  });

  it("shows server field errors and the error message", async () => {
    const { user } = setup(async () => ({
      ok: false,
      error: { code: "conflict", message: "Could not save.", fieldErrors: { email: ["This e-mail is taken"] } },
    }));

    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("This e-mail is taken")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("Could not save.");
  });

  it("disables the form and shows progress while submitting", async () => {
    let finish: (result: ApiResult<{ id: string }>) => void = () => {};
    const { user } = setup(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Create" }));

    const saving = screen.getByRole("button", { name: "Saving…" });
    expect(saving.hasAttribute("disabled")).toBe(true);
    expect(screen.getByLabelText("Name").closest("fieldset")?.disabled).toBe(true);

    finish({ ok: true, data: { id: "1" } });
    expect(await screen.findByRole("button", { name: "Create" })).toBeDefined();
  });

  it("submits on Cmd/Ctrl+Enter", async () => {
    const { user, onSubmit } = setup();

    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.keyboard("{Control>}{Enter}{/Control}");
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("cancels on Escape and with the Cancel button", async () => {
    const { user, onCancel } = setup();

    await user.click(screen.getByLabelText("Name"));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("shows a generic error if onSubmit throws", async () => {
    const { user } = setup(async () => {
      throw new Error("");
    });

    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Something went wrong. Please try again.");
  });
});
