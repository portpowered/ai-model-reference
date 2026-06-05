import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  httpGetStatus,
  pickListenPort,
} from "./http-harness";

export const VERIFY_BASE_URL_ENV = "VERIFY_BASE_URL";

/** Maximum time to wait for the production server to return HTTP 200. */
export const DEFAULT_SERVER_STARTUP_TIMEOUT_MS = 30_000;

export const NEXT_BUILD_REQUIRED_MESSAGE =
  "Production build not found (.next missing). Run `make build` first.";

const DEFAULT_POLL_INTERVAL_MS = 500;
const CHILD_KILL_TIMEOUT_MS = 5_000;

export function normalizeVerifyBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolveVerifyBaseUrlFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const raw = env[VERIFY_BASE_URL_ENV]?.trim();
  if (!raw) {
    return undefined;
  }
  return normalizeVerifyBaseUrl(raw);
}

export function hasNextProductionBuild(
  projectRoot: string = process.cwd(),
): boolean {
  return existsSync(join(projectRoot, ".next"));
}

export function assertNextProductionBuild(
  projectRoot: string = process.cwd(),
): void {
  if (!hasNextProductionBuild(projectRoot)) {
    throw new Error(NEXT_BUILD_REQUIRED_MESSAGE);
  }
}

export function resolveNextProductionServerBin(projectRoot: string): string {
  return join(projectRoot, "node_modules", "next", "dist", "bin", "next");
}

export function defaultSpawnProductionServer(
  port: number,
  projectRoot: string,
): ChildProcess {
  const child = spawn(
    resolveNextProductionServerBin(projectRoot),
    ["start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: projectRoot,
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "production" },
      detached: true,
    },
  );
  child.unref();
  return child;
}

function signalProcessTree(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) {
    child.kill(signal);
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function waitForChildExit(
  child: ChildProcess,
  timeoutMs: number,
): Promise<void> {
  if (child.exitCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.removeListener("exit", onExit);
      resolve();
    }, timeoutMs);

    function onExit() {
      clearTimeout(timer);
      resolve();
    }

    child.once("exit", onExit);
  });
}

export async function killManagedChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  signalProcessTree(child, "SIGTERM");
  await waitForChildExit(child, CHILD_KILL_TIMEOUT_MS);

  if (child.exitCode === null && !child.killed) {
    signalProcessTree(child, "SIGKILL");
    await waitForChildExit(child, 2_000);
  }
}

export type WaitForServerReadyOptions = {
  timeoutMs?: number;
  pollPath?: string;
  pollIntervalMs?: number;
  perRequestTimeoutMs?: number;
};

/**
 * Polls baseUrl + pollPath until HTTP 200 or startup timeout.
 */
export async function waitForServerReady(
  baseUrl: string,
  options: WaitForServerReadyOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SERVER_STARTUP_TIMEOUT_MS;
  const pollPath = options.pollPath ?? "/";
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const perRequestTimeoutMs =
    options.perRequestTimeoutMs ?? Math.min(DEFAULT_FETCH_TIMEOUT_MS, 5_000);

  const healthUrl = `${normalizeVerifyBaseUrl(baseUrl)}${pollPath.startsWith("/") ? pollPath : `/${pollPath}`}`;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const status = await httpGetStatus(healthUrl, perRequestTimeoutMs);
      if (status === 200) {
        return;
      }
      lastError = new Error(`Expected HTTP 200, got ${status}`);
    } catch (error) {
      lastError = error;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(pollIntervalMs, remaining)),
    );
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Server did not become ready within ${timeoutMs}ms (${healthUrl}): ${detail}`,
  );
}

export type VerifyServerSession = {
  baseUrl: string;
  port: number | null;
  cleanup: () => Promise<void>;
};

export type AcquireVerifyServerSessionOptions = {
  projectRoot?: string;
  verifyBaseUrl?: string;
  env?: Record<string, string | undefined>;
  startupTimeoutMs?: number;
  healthPath?: string;
  spawnProductionServer?: (port: number, projectRoot: string) => ChildProcess;
  registerProcessSignals?: boolean;
};

let activeSessionCleanup: (() => Promise<void>) | null = null;
let processSignalsRegistered = false;

function registerProcessSignalHandlers(cleanup: () => Promise<void>): void {
  if (processSignalsRegistered) {
    return;
  }
  processSignalsRegistered = true;

  const onSignal = (signal: NodeJS.Signals) => {
    void cleanup().finally(() => {
      const code = signal === "SIGINT" ? 130 : 143;
      process.exit(code);
    });
  };

  process.once("SIGINT", () => onSignal("SIGINT"));
  process.once("SIGTERM", () => onSignal("SIGTERM"));
}

/**
 * Returns a verify base URL and cleanup that always stops a spawned child server.
 * Honors VERIFY_BASE_URL (or verifyBaseUrl) to skip spawn.
 */
export async function acquireVerifyServerSession(
  options: AcquireVerifyServerSessionOptions = {},
): Promise<VerifyServerSession> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const env = options.env ?? process.env;
  const configuredBaseUrl =
    options.verifyBaseUrl ?? resolveVerifyBaseUrlFromEnv(env);

  if (configuredBaseUrl) {
    return {
      baseUrl: normalizeVerifyBaseUrl(configuredBaseUrl),
      port: null,
      cleanup: async () => {},
    };
  }

  assertNextProductionBuild(projectRoot);

  const port = await pickListenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const spawnProductionServer =
    options.spawnProductionServer ?? defaultSpawnProductionServer;
  const child = spawnProductionServer(port, projectRoot);

  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    if (activeSessionCleanup === cleanup) {
      activeSessionCleanup = null;
    }
    await killManagedChild(child);
  };

  activeSessionCleanup = cleanup;
  if (options.registerProcessSignals !== false) {
    registerProcessSignalHandlers(cleanup);
  }

  try {
    await waitForServerReady(baseUrl, {
      timeoutMs: options.startupTimeoutMs,
      pollPath: options.healthPath,
    });
  } catch (error) {
    await cleanup();
    throw error;
  }

  return { baseUrl, port, cleanup };
}
