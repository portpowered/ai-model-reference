import { describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
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

const repoRoot = join(import.meta.dir, "../../..");

function isGitWorktreeDirty(root: string): boolean {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    return true;
  }
  return (result.stdout ?? "").trim().length > 0;
}

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
      const shippedLocalizedDocsPath = join(
        fixture.worktreePath,
        "src/generated/shipped-localized-docs.ts",
      );
      const publishedDocsManifestPath = join(
        fixture.worktreePath,
        "src/lib/content/published-docs-registry-manifest.ts",
      );
      const registryRuntimePath = join(
        fixture.worktreePath,
        "src/lib/content/registry-runtime.generated.ts",
      );
      const graphRegistryRuntimePath = join(
        fixture.worktreePath,
        "src/lib/content/graph-registry-runtime.generated.ts",
      );

      rmSync(shippedLocalizedDocsPath, { force: true });
      rmSync(publishedDocsManifestPath, { force: true });
      rmSync(registryRuntimePath, { force: true });
      rmSync(graphRegistryRuntimePath, { force: true });

      expect(existsSync(sourceServerPath)).toBe(false);
      expect(existsSync(shippedLocalizedDocsPath)).toBe(false);
      expect(existsSync(publishedDocsManifestPath)).toBe(false);
      expect(existsSync(registryRuntimePath)).toBe(false);
      expect(existsSync(graphRegistryRuntimePath)).toBe(false);

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
        expect(existsSync(shippedLocalizedDocsPath)).toBe(true);
        expect(existsSync(publishedDocsManifestPath)).toBe(true);
        expect(existsSync(registryRuntimePath)).toBe(true);
        expect(existsSync(graphRegistryRuntimePath)).toBe(true);
      } finally {
        await stopChildProcess(child, port);
        fixture.cleanup();
      }
    },
    FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  );
});
