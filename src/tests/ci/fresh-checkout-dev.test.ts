import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  httpGetStatus,
  reserveListenPort,
  waitForListenPortFree,
} from "@/lib/verify/http-harness";
import {
  attachChildOutputCapture,
  CHILD_KILL_TIMEOUT_MS,
  FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  getChildOutputTail,
  shouldRunFreshCheckoutTypecheckProof,
} from "@/lib/verify/server-lifecycle";
import {
  CLEAN_WORKTREE_SOURCE_DIR,
  provisionCleanWorktree,
} from "./clean-worktree-fixture";
import {
  generatedMaintainerArtifactsExist,
  isGitWorktreeDirty,
  removeGeneratedMaintainerArtifacts,
} from "./fresh-checkout-test-helpers";

const repoRoot = join(import.meta.dir, "../../..");

async function stopChildProcess(
  child: ReturnType<typeof spawn>,
  port: number,
): Promise<void> {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise<void>((resolve) => child.once("exit", () => resolve())),
      new Promise<void>((resolve) =>
        setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, CHILD_KILL_TIMEOUT_MS),
      ),
    ]);
  }

  await waitForListenPortFree(port);
}

async function waitForDevServerReady(
  child: ReturnType<typeof spawn>,
  baseUrl: string,
): Promise<void> {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `make dev exited before becoming ready.\n${getChildOutputTail(child)}`,
      );
    }

    try {
      const status = await httpGetStatus(baseUrl, DEFAULT_FETCH_TIMEOUT_MS);
      if (status === 200) {
        return;
      }
    } catch {
      // The dev server is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `make dev did not serve ${baseUrl} within 60s.\n${getChildOutputTail(child)}`,
  );
}

describe("fresh-checkout dev", () => {
  test(
    "make dev regenerates required artifacts before serving from a clean checkout",
    async () => {
      if (!shouldRunFreshCheckoutTypecheckProof()) {
        return;
      }
      if (isGitWorktreeDirty(repoRoot)) {
        return;
      }

      const fixture = provisionCleanWorktree(repoRoot);
      const portReservation = await reserveListenPort();
      const port = portReservation.port;
      const baseUrl = `http://127.0.0.1:${port}`;

      const sourceServerPath = join(
        fixture.worktreePath,
        CLEAN_WORKTREE_SOURCE_DIR,
        "server.ts",
      );
      removeGeneratedMaintainerArtifacts(fixture.worktreePath);

      expect(existsSync(sourceServerPath)).toBe(false);
      expect(generatedMaintainerArtifactsExist(fixture.worktreePath)).toBe(
        false,
      );

      const child = spawn("make", ["dev"], {
        cwd: fixture.worktreePath,
        env: {
          ...process.env,
          HOSTNAME: "127.0.0.1",
          PORT: String(port),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      attachChildOutputCapture(child);
      await portReservation.release();

      try {
        await waitForDevServerReady(child, baseUrl);

        expect(existsSync(sourceServerPath)).toBe(true);
        expect(generatedMaintainerArtifactsExist(fixture.worktreePath)).toBe(
          true,
        );
      } finally {
        await stopChildProcess(child, port);
        fixture.cleanup();
      }
    },
    FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  );
});
