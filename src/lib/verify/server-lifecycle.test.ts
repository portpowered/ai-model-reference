import { afterEach, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  httpGetStatus,
  isListenPortFree,
  pickListenPort,
} from "./http-harness";
import {
  acquireVerifyServerSession,
  assertNextProductionBuild,
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  defaultSpawnProductionServer,
  hasCompleteNextProductionBuild,
  hasNextProductionBuild,
  killManagedChild,
  NEXT_BUILD_REQUIRED_MESSAGE,
  normalizeVerifyBaseUrl,
  resolveNextProductionServerBin,
  resolveVerifyBaseUrlFromEnv,
  shouldRunVerifyProductionIntegrationTests,
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

  test("rejects when the server never returns HTTP 200", async () => {
    const httpServer = createHttpServer((_req, res) => {
      res.writeHead(503);
      res.end("not ready");
    });

    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        waitForServerReady(`http://127.0.0.1:${port}`, {
          timeoutMs: 800,
          pollIntervalMs: 100,
          perRequestTimeoutMs: 300,
          port,
        }),
      ).rejects.toThrow(
        new RegExp(
          `did not become ready.*port ${port}.*health URL http://127\\.0\\.0\\.1:${port}/`,
        ),
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
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

  test("spawns a stub server, waits for readiness, and kills the child on cleanup", async () => {
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

    try {
      await expect(
        acquireVerifyServerSession({
          projectRoot,
          registerProcessSignals: false,
          startupTimeoutMs: 800,
          spawnProductionServer: (port, cwd) => {
            assignedPort = port;
            spawnedChild = spawnNeverReadyServer(port, cwd);
            spawnedChildren.push(spawnedChild);
            return spawnedChild;
          },
        }),
      ).rejects.toThrow(
        new RegExp(
          `did not become ready.*port ${assignedPort ?? "\\d+"}.*health URL http://127\\.0\\.0\\.1:${assignedPort ?? "\\d+"}/`,
        ),
      );

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

  test("terminates a detached stub server and frees the assigned port", async () => {
    const port = await pickListenPort();
    const child = spawnStubProductionServer(port, process.cwd());
    spawnedChildren.push(child);

    await waitForServerReady(`http://127.0.0.1:${port}`, {
      timeoutMs: 5_000,
      pollIntervalMs: 100,
    });
    expect(await isListenPortFree(port)).toBe(false);

    await killManagedChild(child);
    await waitForChildExit(child, 2_000);

    expect(child.exitCode !== null || child.killed === true).toBe(true);
    expect(await isListenPortFree(port)).toBe(true);
  });
});

describe("normalizeVerifyBaseUrl", () => {
  test("strips trailing slashes", () => {
    expect(normalizeVerifyBaseUrl("http://127.0.0.1:3100/")).toBe(
      "http://127.0.0.1:3100",
    );
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
