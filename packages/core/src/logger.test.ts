import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createLogger } from "./logger";

function captureLogs() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  return { lines, stream };
}

describe("createLogger", () => {
  it("redacts credentials at the top level and one level deep", () => {
    const { lines, stream } = captureLogs();
    const logger = createLogger({}, stream);

    logger.info(
      { password: "hunter2", token: "abc", body: { password: "hunter2" }, headers: { authorization: "Bearer x" } },
      "login attempt",
    );

    expect(lines[0]).toMatchObject({
      password: "[redacted]",
      token: "[redacted]",
      body: { password: "[redacted]" },
      headers: { authorization: "[redacted]" },
    });
    expect(JSON.stringify(lines[0])).not.toContain("hunter2");
  });
});
