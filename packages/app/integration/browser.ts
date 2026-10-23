import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { artifactsDir, repoRoot } from "./app-server";

const bin = path.join(repoRoot, "node_modules/.bin/agent-browser");
const COMMAND_TIMEOUT_MS = 60_000;

interface AgentBrowserResult {
  success: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
}

let sessionCounter = 0;

/**
 * A thin wrapper around the agent-browser CLI. Each instance is its own
 * browser session; call `close()` when done. In CI, `AGENT_BROWSER_ARGS`
 * adds `--no-sandbox` (Ubuntu runners restrict Chrome's sandbox).
 */
export class Browser {
  readonly session = `integration-${process.pid}-${++sessionCounter}`;

  async run(...args: string[]): Promise<Record<string, unknown>> {
    let stdout: string;
    try {
      ({ stdout } = await promisify(execFile)(bin, ["--session", this.session, "--json", ...args], {
        timeout: COMMAND_TIMEOUT_MS,
      }));
    } catch (error) {
      // A failed command exits non-zero but still prints its JSON result.
      stdout = (error as { stdout?: string }).stdout ?? "";
      if (!stdout) throw error;
    }
    const result = JSON.parse(stdout) as AgentBrowserResult;
    if (!result.success) throw new Error(`agent-browser ${args.join(" ")}: ${result.error}`);
    return result.data ?? {};
  }

  async open(url: string): Promise<void> {
    await this.run("open", url);
  }

  async waitForText(text: string): Promise<void> {
    await this.run("wait", "--text", text);
  }

  async click(selector: string): Promise<void> {
    await this.run("click", selector);
  }

  /** Clicks the element with this ARIA role and accessible name, e.g. `clickRole("button", "Save")`. */
  async clickRole(role: string, name: string): Promise<void> {
    await this.run("find", "role", role, "click", "--name", name);
  }

  async text(selector: string): Promise<string> {
    return String((await this.run("get", "text", selector)).text);
  }

  async url(): Promise<string> {
    return String((await this.run("get", "url")).url);
  }

  /** Saves a screenshot to the artifacts folder (uploaded by CI on failure). */
  async screenshot(name: string): Promise<void> {
    await this.run("screenshot", path.join(artifactsDir, `${name}.png`));
  }

  async close(): Promise<void> {
    await this.run("close");
  }
}
