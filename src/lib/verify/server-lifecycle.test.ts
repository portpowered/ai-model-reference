import { afterEach, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { httpGetStatus, pickListenPort } from "./http-harness";
import {
  acquireVerifyServerSession,
  assertNextProductionBuild,
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  hasNextProductionBuild,
  killManagedChild,
  NEXT_BUILD_REQUIRED_MESSAGE,
  normalizeVerifyBaseUrl,
  resolveVerifyBaseUrlFromEnv,
  waitForServerReady,
} from "./server-lifecycle";

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
  return spawn("bun", ["-e", STUB_SERVER_SCRIPT], {
    cwd,
    stdio: "ignore",
    detached: true,
    env: {
      ...process.env,
      VERIFY_STUB_PORT: String(port),
    },
  });
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
      expect(() => assertNextProductionBuild(emptyDir)).toThrow(
        NEXT_BUILD_REQUIRED_MESSAGE,
      );
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
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
        }),
      ).rejects.toThrow(/did not become ready/i);
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
    const session = await acquireVerifyServerSession({
      verifyBaseUrl: "http://127.0.0.1:3999",
      registerProcessSignals: false,
    });

    expect(session.baseUrl).toBe("http://127.0.0.1:3999");
    expect(session.port).toBeNull();
    await session.cleanup();
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

      await session.cleanup();

      await expect(
        httpGetStatus(`${session.baseUrl}/`, 500),
      ).rejects.toBeDefined();

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

    try {
      await expect(
        acquireVerifyServerSession({
          projectRoot,
          registerProcessSignals: false,
          startupTimeoutMs: 800,
          spawnProductionServer: (port, cwd) => {
            spawnedChild = spawnNeverReadyServer(port, cwd);
            spawnedChildren.push(spawnedChild);
            return spawnedChild;
          },
        }),
      ).rejects.toThrow(/did not become ready/i);

      expect(spawnedChild).toBeDefined();
      if (spawnedChild) {
        await waitForChildExit(spawnedChild, 2_000);
        expect(
          spawnedChild.exitCode !== null || spawnedChild.killed === true,
        ).toBe(true);
      }
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
