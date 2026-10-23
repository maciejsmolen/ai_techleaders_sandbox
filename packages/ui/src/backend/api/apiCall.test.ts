import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiCall, apiCallOrThrow, CLIENT_HEADER, CLIENT_HEADER_VALUE } from "./apiCall";

function stubFetch(implementation: () => Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(implementation);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("apiCall", () => {
  it("returns the success envelope as is", async () => {
    stubFetch(async () => json({ ok: true, data: [1, 2] }));

    await expect(apiCall<number[]>("/api/things")).resolves.toEqual({ ok: true, data: [1, 2] });
  });

  it("returns the server's error envelope with its field errors", async () => {
    const error = { code: "validation_error", message: "Invalid", fieldErrors: { name: ["Required"] } };
    stubFetch(async () => json({ ok: false, error }, 422));

    await expect(apiCall("/api/things")).resolves.toEqual({ ok: false, error });
  });

  it("sends the client header, and JSON-encodes the body", async () => {
    const fetchMock = stubFetch(async () => json({ ok: true, data: null }));

    await apiCall("/api/things", { method: "POST", body: { name: "Ada" } });

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get(CLIENT_HEADER)).toBe(CLIENT_HEADER_VALUE);
    expect(headers.get("content-type")).toBe("application/json");
    expect(init?.body).toBe('{"name":"Ada"}');
  });

  it("turns a non-JSON response into an error result", async () => {
    stubFetch(async () => new Response("<html>Bad gateway</html>", { status: 502 }));

    await expect(apiCall("/api/things")).resolves.toEqual({
      ok: false,
      error: { code: "invalid_response", message: "Unexpected response from the server (HTTP 502)." },
    });
  });

  it("turns JSON that isn't an envelope into an error result", async () => {
    stubFetch(async () => json({ status: "ok" }));

    await expect(apiCall("/api/things")).resolves.toMatchObject({ ok: false, error: { code: "invalid_response" } });
  });

  it("treats an unreadable or empty body as an invalid response", async () => {
    const unreadable = new Response("{}");
    vi.spyOn(unreadable, "text").mockRejectedValue(new TypeError("body stream already read"));
    stubFetch(async () => unreadable);
    await expect(apiCall("/api/things")).resolves.toMatchObject({ ok: false, error: { code: "invalid_response" } });

    stubFetch(async () => new Response(null, { status: 204 }));
    await expect(apiCall("/api/things")).resolves.toMatchObject({ ok: false, error: { code: "invalid_response" } });
  });

  it("rejects envelopes with the wrong shape", async () => {
    for (const body of [null, "text", { ok: true }, { ok: false, error: { code: 1 } }, { ok: false, error: null }]) {
      stubFetch(async () => json(body));
      await expect(apiCall("/api/things")).resolves.toMatchObject({ ok: false, error: { code: "invalid_response" } });
    }
  });

  it("sends no body or content type for a call without a body, and keeps caller headers", async () => {
    const fetchMock = stubFetch(async () => json({ ok: true, data: null }));

    await apiCall("/api/things", { headers: { "x-trace": "1" } });

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(init?.body).toBeUndefined();
    expect(headers.get("content-type")).toBeNull();
    expect(headers.get("x-trace")).toBe("1");
  });

  it("turns a network failure into an error result instead of throwing", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(apiCall("/api/things")).resolves.toMatchObject({ ok: false, error: { code: "network_error" } });
  });
});

describe("apiCallOrThrow", () => {
  it("returns the data on success", async () => {
    stubFetch(async () => json({ ok: true, data: "hello" }));

    await expect(apiCallOrThrow<string>("/api/things")).resolves.toBe("hello");
  });

  it("throws an ApiError carrying the error envelope", async () => {
    stubFetch(async () => json({ ok: false, error: { code: "not_found", message: "Gone" } }, 404));

    const error = await apiCallOrThrow("/api/things").catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "not_found", message: "Gone" });
  });
});
