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
const CHILD_OUTPUT_TAIL_MAX_BYTES = 4_096;

const childOutputChunks = new WeakMap<ChildProcess, Buffer[]>();

function appendChildOutput(child: ChildProcess, chunk: Buffer): void {
  const chunks = childOutputChunks.get(child) ?? [];
  chunks.push(chunk);
  childOutputChunks.set(child, chunks);

  let totalBytes = chunks.reduce((sum, part) => sum + part.length, 0);
  while (totalBytes > CHILD_OUTPUT_TAIL_MAX_BYTES && chunks.length > 1) {
    const removed = chunks.shift();
    if (!removed) {
      break;
    }
    totalBytes -= removed.length;
  }
}

export function getChildOutputTail(
  child: ChildProcess,
  maxBytes: number = CHILD_OUTPUT_TAIL_MAX_BYTES,
): string {
  const chunks = childOutputChunks.get(child);
  if (!chunks || chunks.length === 0) {
    return "";
  }

  const combined = Buffer.concat(chunks);
  const tail =
    combined.length > maxBytes
      ? combined.subarray(combined.length - maxBytes)
      : combined;
  return tail.toString("utf8").trim();
}

export function attachChildOutputCapture(child: ChildProcess): void {
  if (childOutputChunks.has(child)) {
    return;
  }

  childOutputChunks.set(child, []);

  const onData = (chunk: Buffer | string) => {
    appendChildOutput(
      child,
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
    );
  };

  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);
}

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

/** True when a completed `next build` artifact is present (not an empty `.next` dir). */
export function hasCompleteNextProductionBuild(
  projectRoot: string = process.cwd(),
): boolean {
  return existsSync(join(projectRoot, ".next", "BUILD_ID"));
}

/**
 * Gates opt-in production-server integration tests: skip the coverage subprocess
 * rerun (make ci) and require a completed build artifact.
 */
export function shouldRunVerifyProductionIntegrationTests(
  projectRoot: string = process.cwd(),
): boolean {
  if (process.argv.includes("--coverage")) {
    return false;
  }
  return hasCompleteNextProductionBuild(projectRoot);
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
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production" },
      detached: true,
    },
  );
  attachChildOutputCapture(child);
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
  port?: number;
};

function formatReadinessTimeoutError(
  timeoutMs: number,
  healthUrl: string,
  port: number | undefined,
  lastError: unknown,
): Error {
  const detail =
    lastError instanceof Error ? lastError.message : String(lastError);
  const portDetail = port === undefined ? "" : `port ${port}, `;
  return new Error(
    `Server did not become ready within ${timeoutMs}ms (${portDetail}health URL ${healthUrl}): ${detail}`,
  );
}

function formatChildEarlyExitError(
  child: ChildProcess,
  port: number,
  healthUrl: string,
  exitCode: number | null,
  signal: NodeJS.Signals | null,
): Error {
  const exitParts: string[] = [];
  if (exitCode !== null) {
    exitParts.push(`exit code ${exitCode}`);
  }
  if (signal) {
    exitParts.push(`signal ${signal}`);
  }

  const exitDetail = exitParts.length > 0 ? ` (${exitParts.join(", ")})` : "";
  const outputTail = getChildOutputTail(child);
  const outputDetail = outputTail ? `\nChild output tail:\n${outputTail}` : "";

  return new Error(
    `Production server exited before becoming ready (port ${port}, health URL ${healthUrl})${exitDetail}${outputDetail}`,
  );
}

function waitForChildEarlyExit(
  child: ChildProcess,
  port: number,
  healthUrl: string,
): { promise: Promise<never>; cancel: () => void } {
  if (child.exitCode !== null) {
    return {
      promise: Promise.reject(
        formatChildEarlyExitError(
          child,
          port,
          healthUrl,
          child.exitCode,
          child.signalCode,
        ),
      ),
      cancel: () => {},
    };
  }

  let onExit:
    | ((code: number | null, signal: NodeJS.Signals | null) => void)
    | null = null;

  const promise = new Promise<never>((_, reject) => {
    onExit = (code, signal) => {
      reject(formatChildEarlyExitError(child, port, healthUrl, code, signal));
    };
    child.once("exit", onExit);
  });

  return {
    promise,
    cancel: () => {
      if (onExit) {
        child.removeListener("exit", onExit);
      }
    },
  };
}

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

  throw formatReadinessTimeoutError(
    timeoutMs,
    healthUrl,
    options.port,
    lastError,
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
  attachChildOutputCapture(child);

  const healthPath = options.healthPath ?? "/";
  const healthUrl = `${baseUrl}${healthPath.startsWith("/") ? healthPath : `/${healthPath}`}`;

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

  const earlyExit = waitForChildEarlyExit(child, port, healthUrl);
  try {
    await Promise.race([
      waitForServerReady(baseUrl, {
        timeoutMs: options.startupTimeoutMs,
        pollPath: options.healthPath,
        port,
      }),
      earlyExit.promise,
    ]);
  } catch (error) {
    await cleanup();
    throw error;
  } finally {
    earlyExit.cancel();
  }

  return { baseUrl, port, cleanup };
}
