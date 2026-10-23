// @vitest-environment jsdom
import type { ApiResult } from "@devmentor/ui/backend/api";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn<(path: string, init?: RequestInit) => Promise<ApiResult<unknown>>>();

vi.mock("@devmentor/ui/backend/api", () => ({ apiCall: (path: string, init?: RequestInit) => apiCall(path, init) }));

const { SystemStatus } = await import("./system-status");

const healthy: ApiResult<unknown> = { ok: true, data: { status: "ok", db: "ok" } };
const down: ApiResult<unknown> = {
  ok: false,
  error: { code: "service_unavailable", message: "The database is unreachable." },
};

const cells = () => within(screen.getByRole("table")).getAllByRole("cell").map((cell) => cell.textContent);

beforeEach(() => apiCall.mockReset());
afterEach(cleanup);

describe("SystemStatus", () => {
  it("loads /api/health without caching and shows the database status", async () => {
    apiCall.mockResolvedValue(healthy);
    render(<SystemStatus />);

    expect(screen.getByRole("status")).toBeDefined();
    expect(await screen.findByRole("table")).toBeDefined();
    expect(cells()).toEqual(["Database", "OK"]);
    expect(apiCall).toHaveBeenCalledWith("/api/health", { cache: "no-store" });
  });

  it("shows the error message when the check fails", async () => {
    apiCall.mockResolvedValue(down);
    render(<SystemStatus />);

    expect((await screen.findByRole("alert")).textContent).toContain("The database is unreachable.");
  });

  it("shows any other status as is", async () => {
    apiCall.mockResolvedValue({ ok: true, data: { status: "ok", db: "degraded" } });
    render(<SystemStatus />);

    await screen.findByRole("table");
    expect(cells()).toEqual(["Database", "degraded"]);
  });

  it("reloads on Refresh, replacing an error with the new result", async () => {
    apiCall.mockResolvedValueOnce(down).mockResolvedValueOnce(healthy);
    const user = userEvent.setup();
    render(<SystemStatus />);
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByRole("table")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it("ignores a response that arrives after unmount", async () => {
    let resolve: (result: ApiResult<unknown>) => void = () => {};
    apiCall.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const consoleError = vi.spyOn(console, "error");
    const { unmount } = render(<SystemStatus />);

    unmount();
    resolve(healthy);
    await Promise.resolve();

    expect(consoleError).not.toHaveBeenCalled();
  });
});
