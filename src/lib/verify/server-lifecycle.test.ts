import { afterEach, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  httpGetStatus,
  isListenPortFree,
  pickListenPort,
  VERIFY_PORT_RANGE_END,
  VERIFY_PORT_RANGE_START,
} from "./http-harness";
import { writeProductionIntegrationBuildDigest } from "./production-integration-build-trust";
import {
  acquireVerifyServerSession,
  assertNextProductionBuild,
  attachChildOutputCapture,
  buildDefaultProductionServerSpawnSpec,
  CHILD_KILL_TIMEOUT_MS,
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  defaultSpawnProductionServer,
  getChildOutputTail,
  hasCompleteNextProductionBuild,
  hasNextProductionBuild,
  killManagedChild,
  NEXT_BUILD_REQUIRED_MESSAGE,
  normalizeVerifyBaseUrl,
  resolveNextProductionServerBin,
  resolveServerStartupTimeoutMsFromEnv,
  resolveVerifyBaseUrlFromEnv,
  shouldRunVerifyProductionIntegrationTests,
  VERIFY_COVERAGE_SUBPROCESS_ENV,
  VERIFY_SERVER_STARTUP_TIMEOUT_MS_ENV,
  waitForServerReady,
} from "./server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");

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

/** Waits for stdio to close so captured output tails are fully flushed. */
function waitForChildClose(
  child: ChildProcess,
  timeoutMs: number,
): Promise<void> {
  if (child.exitCode !== null && child.stdout?.readable === false) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.removeListener("close", onClose);
      resolve();
    }, timeoutMs);

    function onClose() {
      clearTimeout(timer);
      resolve();
    }

    child.once("close", onClose);
  });
}

function listenOnEphemeralPort(
  httpServer: ReturnType<typeof createHttpServer>,
): Promise<number> {
  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("Expected bound TCP port"));
        return;
      }
      resolve(address.port);
    });
  });
}

async function reserveClosedEphemeralPort(): Promise<number> {
  const httpServer = createHttpServer();
  const port = await listenOnEphemeralPort(httpServer);

  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => (error ? reject(error) : resolve()));
  });

  return port;
}

const STUB_SERVER_SCRIPT = `
import { createServer } from "node:http";
const port = Number(process.env.VERIFY_STUB_PORT);
if (!Number.isFinite(port)) {
  console.error("VERIFY_STUB_PORT required");
  process.exit(1);
}
createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
}).listen(port, "127.0.0.1");
`;

function spawnStubProductionServer(port: number, cwd: string): ChildProcess {
  const child = spawn("bun", ["-e", STUB_SERVER_SCRIPT], {
    cwd,
    stdio: "ignore",
    detached: true,
    env: {
      ...process.env,
      VERIFY_STUB_PORT: String(port),
    },
  });
  child.unref();
  return child;
}

const FAKE_READY_NEXT_BIN_BODY = `
const args = process.argv.slice(2);
const portFlagIndex = args.indexOf("-p");
const port = portFlagIndex >= 0 ? Number(args[portFlagIndex + 1]) : Number.NaN;
if (!Number.isFinite(port)) {
  console.error("fake next start: -p port required");
  process.exit(1);
}
import { createServer } from "node:http";
createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
}).listen(port, "127.0.0.1");
`;

function writeFakeNextBin(projectRoot: string, scriptBody: string): void {
  const nextBinPath = resolveNextProductionServerBin(projectRoot);
  mkdirSync(dirname(nextBinPath), { recursive: true });
  writeFileSync(nextBinPath, `#!/usr/bin/env bun\n${scriptBody}`, {
    mode: 0o755,
  });
}

function createFakeNextFixtureRoot(scriptBody: string): string {
  const projectRoot = mkdtempSync(join(tmpdir(), "verify-fake-next-"));
  mkdirSync(join(projectRoot, ".next"));
  writeFakeNextBin(projectRoot, scriptBody);
  return projectRoot;
}

function waitForChildExitCode(child: ChildProcess, timeoutMs: number): void {
  const deadline = Date.now() + timeoutMs;
  while (child.exitCode === null && Date.now() < deadline) {
    // Busy-wait so injected spawn functions can return an already-exited child.
  }
}

function spawnAlreadyExitedProductionServer(
  _port: number,
  cwd: string,
): ChildProcess {
  const child = spawn(
    "bun",
    ["-e", 'console.error("instant exit"); process.exit(99);'],
    {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  attachChildOutputCapture(child);
  waitForChildExitCode(child, 2_000);
  return child;
}

describe("resolveVerifyBaseUrlFromEnv", () => {
  test("returns undefined when VERIFY_BASE_URL is unset", () => {
    expect(resolveVerifyBaseUrlFromEnv({})).toBeUndefined();
  });

  test("normalizes trailing slashes", () => {
    expect(
      resolveVerifyBaseUrlFromEnv({
        VERIFY_BASE_URL: "http://127.0.0.1:3456///",
      }),
    ).toBe("http://127.0.0.1:3456");
  });
});

describe("resolveServerStartupTimeoutMsFromEnv", () => {
  test("returns undefined when VERIFY_SERVER_STARTUP_TIMEOUT_MS is unset", () => {
    expect(resolveServerStartupTimeoutMsFromEnv({})).toBeUndefined();
  });

  test("parses a positive integer timeout override", () => {
    expect(
      resolveServerStartupTimeoutMsFromEnv({
        [VERIFY_SERVER_STARTUP_TIMEOUT_MS_ENV]: "1500",
      }),
    ).toBe(1500);
  });

  test("rejects non-numeric, zero, and negative timeout overrides", () => {
    expect(
      resolveServerStartupTimeoutMsFromEnv({
        [VERIFY_SERVER_STARTUP_TIMEOUT_MS_ENV]: "not-a-number",
      }),
    ).toBeUndefined();
    expect(
      resolveServerStartupTimeoutMsFromEnv({
        [VERIFY_SERVER_STARTUP_TIMEOUT_MS_ENV]: "0",
      }),
    ).toBeUndefined();
    expect(
      resolveServerStartupTimeoutMsFromEnv({
        [VERIFY_SERVER_STARTUP_TIMEOUT_MS_ENV]: "-1",
      }),
    ).toBeUndefined();
  });
});

describe("assertNextProductionBuild", () => {
  test("throws a clear message when .next is missing", () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "verify-no-next-"));
    try {
      expect(hasNextProductionBuild(emptyDir)).toBe(false);
      expect(hasCompleteNextProductionBuild(emptyDir)).toBe(false);
      expect(() => assertNextProductionBuild(emptyDir)).toThrow(
        NEXT_BUILD_REQUIRED_MESSAGE,
      );
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test("treats an empty .next directory as incomplete for integration gating", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-empty-next-"));
    mkdirSync(join(projectRoot, ".next"));
    try {
      expect(hasNextProductionBuild(projectRoot)).toBe(true);
      expect(hasCompleteNextProductionBuild(projectRoot)).toBe(false);
      expect(shouldRunVerifyProductionIntegrationTests(projectRoot)).toBe(
        false,
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("skips production integration tests when build digest is missing", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-no-digest-"));
    mkdirSync(join(projectRoot, ".next"), { recursive: true });
    writeFileSync(join(projectRoot, ".next", "BUILD_ID"), "test-build");

    try {
      expect(hasCompleteNextProductionBuild(projectRoot)).toBe(true);
      expect(shouldRunVerifyProductionIntegrationTests(projectRoot)).toBe(
        false,
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("skips production integration tests during the coverage subprocess rerun", () => {
    expect(
      shouldRunVerifyProductionIntegrationTests(repoRoot, {
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
  });

  test("allows production integration tests when trusted build digest matches", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-complete-next-"));
    mkdirSync(join(projectRoot, "src"), { recursive: true });
    writeFileSync(join(projectRoot, "package.json"), '{"name":"fixture"}\n');
    writeFileSync(join(projectRoot, "src", "app.ts"), "export {};\n");
    mkdirSync(join(projectRoot, ".next"), { recursive: true });
    writeFileSync(join(projectRoot, ".next", "BUILD_ID"), "test-build");

    try {
      writeProductionIntegrationBuildDigest(projectRoot);
      expect(hasCompleteNextProductionBuild(projectRoot)).toBe(true);
      expect(shouldRunVerifyProductionIntegrationTests(projectRoot, {})).toBe(
        true,
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("allows production integration tests when Next.js 16 Turbopack build markers are present", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-turbopack-next-"));
    mkdirSync(join(projectRoot, "src"), { recursive: true });
    writeFileSync(join(projectRoot, "package.json"), '{"name":"fixture"}\n');
    writeFileSync(join(projectRoot, "src", "app.ts"), "export {};\n");
    mkdirSync(join(projectRoot, ".next", "server"), { recursive: true });
    writeFileSync(
      join(projectRoot, ".next", "server", "app-paths-manifest.json"),
      "{}",
    );
    writeFileSync(join(projectRoot, ".next", "build-manifest.json"), "{}");

    try {
      writeProductionIntegrationBuildDigest(projectRoot);
      expect(hasCompleteNextProductionBuild(projectRoot)).toBe(true);
      expect(shouldRunVerifyProductionIntegrationTests(projectRoot, {})).toBe(
        true,
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("waitForServerReady", () => {
  test("resolves when the health URL returns HTTP 200", async () => {
    const httpServer = createHttpServer((_req, res) => {
      res.writeHead(200);
      res.end("ok");
    });

    const port = await listenOnEphemeralPort(httpServer);

    try {
      await waitForServerReady(`http://127.0.0.1:${port}`, {
        timeoutMs: 5_000,
        pollIntervalMs: 100,
      });
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("rejects with timeout, health URL, and last HTTP status when never ready", async () => {
    const httpServer = createHttpServer((_req, res) => {
      res.writeHead(503);
      res.end("not ready");
    });

    const port = await listenOnEphemeralPort(httpServer);
    const healthUrl = `http://127.0.0.1:${port}/`;
    const timeoutMs = 800;

    try {
      let readinessError: Error | undefined;
      try {
        await waitForServerReady(`http://127.0.0.1:${port}`, {
          timeoutMs,
          pollIntervalMs: 100,
          perRequestTimeoutMs: 300,
          port,
        });
      } catch (error) {
        readinessError = error as Error;
      }

      expect(readinessError?.message).toMatch(/did not become ready/i);
      expect(readinessError?.message).toContain(`within ${timeoutMs}ms`);
      expect(readinessError?.message).toContain(`health URL ${healthUrl}`);
      expect(readinessError?.message).toContain("Expected HTTP 200, got 503");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("rejects with timeout, health URL, and last network error when nothing is listening", async () => {
    const port = await reserveClosedEphemeralPort();
    const healthUrl = `http://127.0.0.1:${port}/`;
    const timeoutMs = 600;

    let readinessError: Error | undefined;
    try {
      await waitForServerReady(`http://127.0.0.1:${port}`, {
        timeoutMs,
        pollIntervalMs: 100,
        perRequestTimeoutMs: 300,
        port,
      });
    } catch (error) {
      readinessError = error as Error;
    }

    expect(readinessError).toBeDefined();
    expect(readinessError?.message).toMatch(/did not become ready/i);
    expect(readinessError?.message).toContain(`within ${timeoutMs}ms`);
    expect(readinessError?.message).toContain(`health URL ${healthUrl}`);
    expect(readinessError?.message?.length).toBeGreaterThan(
      `Server did not become ready within ${timeoutMs}ms (port ${port}, health URL ${healthUrl}): `
        .length,
    );
  });
});

describe("acquireVerifyServerSession", () => {
  const spawnedChildren: ChildProcess[] = [];

  afterEach(async () => {
    await Promise.all(
      spawnedChildren.splice(0).map((child) => killManagedChild(child)),
    );
  });

  test("uses VERIFY_BASE_URL without spawning a child", async () => {
    const httpServer = createHttpServer((_req, res) => {
      res.writeHead(200);
      res.end("external");
    });
    const externalPort = await listenOnEphemeralPort(httpServer);

    try {
      const session = await acquireVerifyServerSession({
        verifyBaseUrl: `http://127.0.0.1:${externalPort}`,
        registerProcessSignals: false,
      });

      expect(session.baseUrl).toBe(`http://127.0.0.1:${externalPort}`);
      expect(session.port).toBeNull();
      expect(await httpGetStatus(`${session.baseUrl}/`, 2_000)).toBe(200);

      await session.cleanup();

      expect(
        await httpGetStatus(`http://127.0.0.1:${externalPort}/`, 2_000),
      ).toBe(200);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("default path picks a verify port and returns loopback baseUrl without VERIFY_BASE_URL", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-default-baseurl-"));
    mkdirSync(join(projectRoot, ".next"));

    try {
      const session = await acquireVerifyServerSession({
        projectRoot,
        env: {},
        registerProcessSignals: false,
        spawnProductionServer: (port, cwd) => {
          const child = spawnStubProductionServer(port, cwd);
          spawnedChildren.push(child);
          return child;
        },
      });

      try {
        expect(session.port).not.toBeNull();
        expect(session.port).toBeGreaterThanOrEqual(VERIFY_PORT_RANGE_START);
        expect(session.port).toBeLessThanOrEqual(VERIFY_PORT_RANGE_END);
        expect(session.baseUrl).toBe(`http://127.0.0.1:${session.port}`);
      } finally {
        await session.cleanup();
      }
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("default-path success: cleanup terminates the spawned child and stops serving HTTP", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-stub-root-"));
    mkdirSync(join(projectRoot, ".next"));

    let spawnedChild: ChildProcess | undefined;

    try {
      const session = await acquireVerifyServerSession({
        projectRoot,
        registerProcessSignals: false,
        spawnProductionServer: (port, cwd) => {
          spawnedChild = spawnStubProductionServer(port, cwd);
          spawnedChildren.push(spawnedChild);
          return spawnedChild;
        },
      });

      expect(session.port).not.toBeNull();
      expect(normalizeVerifyBaseUrl(session.baseUrl)).toBe(
        `http://127.0.0.1:${session.port}`,
      );

      expect(await httpGetStatus(`${session.baseUrl}/`, 2_000)).toBe(200);
      expect(spawnedChild).toBeDefined();
      expect(spawnedChild?.exitCode).toBeNull();

      const assignedPort = session.port as number;
      await session.cleanup();
      await session.cleanup();

      await expect(
        httpGetStatus(`${session.baseUrl}/`, 500),
      ).rejects.toBeDefined();
      expect(await isListenPortFree(assignedPort)).toBe(true);

      if (spawnedChild) {
        await waitForChildExit(spawnedChild, 1_000);
        expect(
          spawnedChild.exitCode !== null || spawnedChild.killed === true,
        ).toBe(true);
      }
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("startup timeout is at most 30 seconds by default", () => {
    expect(DEFAULT_SERVER_STARTUP_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });

  test("rejects immediately when spawn returns an already-exited child", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-sync-early-exit-"));
    mkdirSync(join(projectRoot, ".next"));

    let startupError: Error | undefined;

    try {
      try {
        await acquireVerifyServerSession({
          projectRoot,
          registerProcessSignals: false,
          spawnProductionServer: spawnAlreadyExitedProductionServer,
        });
      } catch (error) {
        startupError = error as Error;
      }

      expect(startupError?.message).toMatch(/exited before becoming ready/);
      expect(startupError?.message).toContain("exit code 99");
      expect(startupError?.message).toContain("instant exit");
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("registers process signal handlers on the default-path session", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-signal-handlers-"));
    mkdirSync(join(projectRoot, ".next"));

    try {
      const session = await acquireVerifyServerSession({
        projectRoot,
        env: {},
        spawnProductionServer: (port, cwd) => {
          const child = spawnStubProductionServer(port, cwd);
          spawnedChildren.push(child);
          return child;
        },
      });

      await session.cleanup();

      const secondSession = await acquireVerifyServerSession({
        projectRoot,
        env: {},
        spawnProductionServer: (port, cwd) => {
          const child = spawnStubProductionServer(port, cwd);
          spawnedChildren.push(child);
          return child;
        },
      });

      await secondSession.cleanup();
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  }, 15_000);

  test("fails fast with exit code and child output when the spawned server exits early", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-early-exit-"));
    mkdirSync(join(projectRoot, ".next"));

    const STUB_EXIT_SCRIPT = `
console.error("fatal production boot error");
process.exit(42);
`;

    function spawnExitingServer(_port: number, cwd: string): ChildProcess {
      return spawn("bun", ["-e", STUB_EXIT_SCRIPT], {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      });
    }

    let spawnedChild: ChildProcess | undefined;
    let startupError: Error | undefined;

    try {
      try {
        await acquireVerifyServerSession({
          projectRoot,
          registerProcessSignals: false,
          spawnProductionServer: (port, cwd) => {
            spawnedChild = spawnExitingServer(port, cwd);
            spawnedChildren.push(spawnedChild);
            return spawnedChild;
          },
        });
      } catch (error) {
        startupError = error as Error;
      }

      expect(startupError?.message).toMatch(/exited before becoming ready/);
      expect(startupError?.message).toContain("exit code 42");
      expect(startupError?.message).toContain("fatal production boot error");

      expect(spawnedChild).toBeDefined();
      if (spawnedChild) {
        await waitForChildExit(spawnedChild, 2_000);
        expect(spawnedChild.exitCode).toBe(42);
      }
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("fails with a clear message and cleans up when startup times out", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-start-timeout-"));
    mkdirSync(join(projectRoot, ".next"));

    const STUB_NEVER_READY_SCRIPT = `
import { createServer } from "node:http";
const port = Number(process.env.VERIFY_STUB_PORT);
createServer((_req, res) => {
  res.writeHead(503);
  res.end("not ready");
}).listen(port, "127.0.0.1");
`;

    function spawnNeverReadyServer(port: number, cwd: string): ChildProcess {
      return spawn("bun", ["-e", STUB_NEVER_READY_SCRIPT], {
        cwd,
        stdio: "ignore",
        detached: true,
        env: {
          ...process.env,
          VERIFY_STUB_PORT: String(port),
        },
      });
    }

    let spawnedChild: ChildProcess | undefined;
    let assignedPort: number | undefined;

    const startupTimeoutMs = 800;
    let startupError: Error | undefined;

    try {
      try {
        await acquireVerifyServerSession({
          projectRoot,
          registerProcessSignals: false,
          startupTimeoutMs,
          spawnProductionServer: (port, cwd) => {
            assignedPort = port;
            spawnedChild = spawnNeverReadyServer(port, cwd);
            spawnedChildren.push(spawnedChild);
            return spawnedChild;
          },
        });
      } catch (error) {
        startupError = error as Error;
      }

      expect(startupError?.message).toMatch(/did not become ready/i);
      expect(startupError?.message).toContain(`within ${startupTimeoutMs}ms`);
      expect(assignedPort).toBeDefined();
      expect(startupError?.message).toContain(
        `health URL http://127.0.0.1:${assignedPort}/`,
      );
      expect(startupError?.message).toContain("Expected HTTP 200, got 503");

      expect(spawnedChild).toBeDefined();
      expect(assignedPort).toBeDefined();
      if (spawnedChild) {
        await waitForChildExit(spawnedChild, 2_000);
        expect(
          spawnedChild.exitCode !== null || spawnedChild.killed === true,
        ).toBe(true);
      }
      if (assignedPort !== undefined) {
        expect(await isListenPortFree(assignedPort)).toBe(true);
      }
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("killManagedChild", () => {
  const spawnedChildren: ChildProcess[] = [];

  afterEach(async () => {
    await Promise.all(
      spawnedChildren.splice(0).map((child) => killManagedChild(child)),
    );
  });

  test("uses child.kill when the managed child has no pid", async () => {
    let killedWith: NodeJS.Signals | undefined;
    let recordedExitCode: number | null = null;
    const fakeChild = {
      pid: undefined,
      get exitCode() {
        return recordedExitCode;
      },
      killed: false,
      kill(signal?: NodeJS.Signals) {
        killedWith = signal;
        recordedExitCode = 0;
      },
      once: () => fakeChild,
      removeListener: () => fakeChild,
    } as unknown as ChildProcess;

    await killManagedChild(fakeChild);

    expect(killedWith).toBe("SIGTERM");
    expect(recordedExitCode === 0).toBe(true);
  });

  test("returns immediately when the child already exited", async () => {
    const child = spawn("bun", ["-e", "process.exit(0)"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForChildExit(child, 5_000);

    await expect(killManagedChild(child)).resolves.toBeUndefined();
    expect(child.exitCode).toBe(0);
  });

  test("terminates a detached stub child within the configured kill timeout", async () => {
    const port = await pickListenPort();
    const child = spawnStubProductionServer(port, process.cwd());
    spawnedChildren.push(child);

    await waitForServerReady(`http://127.0.0.1:${port}`, {
      timeoutMs: 5_000,
      pollIntervalMs: 100,
    });
    expect(await isListenPortFree(port)).toBe(false);

    const killStartedAt = Date.now();
    await killManagedChild(child);
    const killElapsedMs = Date.now() - killStartedAt;

    await waitForChildExit(child, 1_000);

    expect(killElapsedMs).toBeLessThanOrEqual(CHILD_KILL_TIMEOUT_MS);
    expect(child.exitCode !== null || child.killed === true).toBe(true);
    expect(await isListenPortFree(port)).toBe(true);
    await expect(
      httpGetStatus(`http://127.0.0.1:${port}/`, 500),
    ).rejects.toBeDefined();
  });

  test("cleanup is idempotent and does not throw on a second call", async () => {
    const projectRoot = mkdtempSync(
      join(tmpdir(), "verify-cleanup-idempotent-"),
    );
    mkdirSync(join(projectRoot, ".next"));

    try {
      const session = await acquireVerifyServerSession({
        projectRoot,
        env: {},
        registerProcessSignals: false,
        spawnProductionServer: (port, cwd) => {
          const child = spawnStubProductionServer(port, cwd);
          spawnedChildren.push(child);
          return child;
        },
      });

      await session.cleanup();
      await expect(session.cleanup()).resolves.toBeUndefined();
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("normalizeVerifyBaseUrl", () => {
  test("strips trailing slashes", () => {
    expect(normalizeVerifyBaseUrl("http://127.0.0.1:3100/")).toBe(
      "http://127.0.0.1:3100",
    );
  });
});

describe("child output capture", () => {
  test("getChildOutputTail keeps only the most recent bytes across chunks", async () => {
    const child = spawn("bun", ["-e", 'console.log("x".repeat(5000))'], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    attachChildOutputCapture(child);
    await waitForChildClose(child, 5_000);

    const tail = getChildOutputTail(child, 100);
    expect(tail.length).toBeLessThanOrEqual(100);
    expect(tail.endsWith("x")).toBe(true);
  });

  test("attachChildOutputCapture is idempotent for the same child", async () => {
    const child = spawn("bun", ["-e", 'console.log("captured")'], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    attachChildOutputCapture(child);
    attachChildOutputCapture(child);
    await waitForChildClose(child, 5_000);

    expect(getChildOutputTail(child)).toContain("captured");
  });

  test("getChildOutputTail trims older chunks when output exceeds the tail budget", async () => {
    const child = spawn(
      "bun",
      [
        "-e",
        'for (let i = 0; i < 120; i++) console.log("line-" + String(i).padStart(3, "0") + "-" + "y".repeat(40));',
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    attachChildOutputCapture(child);
    await waitForChildClose(child, 10_000);

    const tail = getChildOutputTail(child);
    expect(tail).toContain("line-119");
    expect(tail).not.toContain("line-000");
  });
});

describe("acquireVerifyServerSession build guard", () => {
  test("requires .next before spawn when VERIFY_BASE_URL is unset", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-no-build-"));

    try {
      await expect(
        acquireVerifyServerSession({
          projectRoot,
          registerProcessSignals: false,
        }),
      ).rejects.toThrow(NEXT_BUILD_REQUIRED_MESSAGE);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("pickListenPort integration", () => {
  test("consecutive picks remain usable for stub lifecycle", async () => {
    const port = await pickListenPort();
    expect(port).toBeGreaterThanOrEqual(3100);
    expect(port).toBeLessThanOrEqual(3999);
  });
});

describe("defaultSpawnProductionServer spawn contract", () => {
  test("buildDefaultProductionServerSpawnSpec matches bun run start loopback contract", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-spawn-contract-"));
    const port = 3456;

    try {
      const spec = buildDefaultProductionServerSpawnSpec(port, projectRoot);

      expect(spec.command).toBe(resolveNextProductionServerBin(projectRoot));
      expect(spec.args).toEqual([
        "start",
        "-p",
        String(port),
        "-H",
        "127.0.0.1",
      ]);
      expect(spec.options.cwd).toBe(projectRoot);
      expect(spec.options.detached).toBe(true);
      expect(spec.options.stdio).toEqual(["ignore", "pipe", "pipe"]);
      expect(spec.options.env).toMatchObject({ NODE_ENV: "production" });
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("defaultSpawnProductionServer integration", () => {
  const spawnedChildren: ChildProcess[] = [];

  afterEach(async () => {
    await Promise.all(
      spawnedChildren.splice(0).map((child) => killManagedChild(child)),
    );
  });

  test("resolveNextProductionServerBin points at the local next CLI", () => {
    expect(resolveNextProductionServerBin(repoRoot)).toBe(
      join(repoRoot, "node_modules", "next", "dist", "bin", "next"),
    );
  });

  test("defaultSpawnProductionServer reaches HTTP 200 using a fixture next bin", async () => {
    const projectRoot = createFakeNextFixtureRoot(FAKE_READY_NEXT_BIN_BODY);
    const port = await pickListenPort();

    const child = defaultSpawnProductionServer(port, projectRoot);
    spawnedChildren.push(child);

    try {
      await waitForServerReady(`http://127.0.0.1:${port}`, {
        timeoutMs: 5_000,
        pollIntervalMs: 100,
      });
      expect(child.exitCode).toBeNull();
      expect(await httpGetStatus(`http://127.0.0.1:${port}/`, 2_000)).toBe(200);
    } finally {
      await killManagedChild(child);
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test(
    "default spawn reaches HTTP 200 on loopback when production build exists",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const port = await pickListenPort();
      const child = defaultSpawnProductionServer(port, repoRoot);
      spawnedChildren.push(child);

      await waitForServerReady(`http://127.0.0.1:${port}`, {
        timeoutMs: DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
      });

      expect(child.exitCode).toBeNull();
      expect(await httpGetStatus(`http://127.0.0.1:${port}/`, 5_000)).toBe(200);
    },
    DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 10_000,
  );

  test(
    "acquireVerifyServerSession default path uses normalized loopback baseUrl",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const session = await acquireVerifyServerSession({
        projectRoot: repoRoot,
        registerProcessSignals: false,
      });

      try {
        expect(session.port).not.toBeNull();
        expect(session.port).toBeGreaterThanOrEqual(3100);
        expect(session.port).toBeLessThanOrEqual(3999);
        expect(session.baseUrl).toBe(`http://127.0.0.1:${session.port}`);
        expect(normalizeVerifyBaseUrl(`${session.baseUrl}/`)).toBe(
          session.baseUrl,
        );
        expect(await httpGetStatus(`${session.baseUrl}/`, 5_000)).toBe(200);
      } finally {
        await session.cleanup();
      }
    },
    DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 10_000,
  );
});
