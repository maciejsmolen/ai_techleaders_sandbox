import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";
import { LoadingMessage } from "./LoadingMessage";

describe("feedback components", () => {
  it("LoadingMessage announces itself as a status", () => {
    render(<LoadingMessage label="Loading sessions…" />);

    expect(screen.getByRole("status").textContent).toContain("Loading sessions…");
  });

  it("ErrorMessage is an alert with title, message and action", () => {
    render(<ErrorMessage message="The database is unreachable." action={<button>Retry</button>} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Something went wrong");
    expect(alert.textContent).toContain("The database is unreachable.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("EmptyState renders a custom title and an action", () => {
    render(<EmptyState title="No sessions" action={<button>Book one</button>} />);

    expect(screen.getByText("No sessions")).toBeDefined();
    expect(screen.getByRole("button", { name: "Book one" })).toBeDefined();
  });

  it("LoadingMessage and ErrorMessage have defaults", () => {
    render(
      <>
        <LoadingMessage />
        <ErrorMessage title="Could not load" />
      </>,
    );

    expect(screen.getByRole("status").textContent).toContain("Loading…");
    expect(screen.getByRole("alert").textContent).toBe("Could not load");
  });

  it("EmptyState shows a default title", () => {
    render(<EmptyState description="Add your first mentor." />);

    expect(screen.getByText("Nothing here yet")).toBeDefined();
    expect(screen.getByText("Add your first mentor.")).toBeDefined();
  });
});
