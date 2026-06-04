import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CLEAN_WORKTREE_SOURCE_DIR,
  provisionCleanWorktree,
} from "./clean-worktree-fixture";

const repoRoot = join(import.meta.dir, "../../..");
const mainSourceDir = join(repoRoot, CLEAN_WORKTREE_SOURCE_DIR);

/** Frozen lockfile install in a fresh worktree can exceed Bun's 5s default. */
const CLEAN_WORKTREE_FIXTURE_TEST_TIMEOUT_MS = 180_000;

describe("clean-worktree fixture", () => {
  test(
    "provisions a detached worktree without .source/ and cleans up reliably",
    () => {
      const mainHadSourceBefore = existsSync(mainSourceDir);

      const fixture = provisionCleanWorktree(repoRoot);

      try {
        expect(existsSync(fixture.worktreePath)).toBe(true);
        expect(
          existsSync(join(fixture.worktreePath, CLEAN_WORKTREE_SOURCE_DIR)),
        ).toBe(false);
        expect(existsSync(join(fixture.worktreePath, "node_modules"))).toBe(
          true,
        );
        expect(existsSync(join(fixture.worktreePath, "package.json"))).toBe(
          true,
        );
      } finally {
        fixture.cleanup();
      }

      expect(existsSync(fixture.worktreePath)).toBe(false);
      expect(existsSync(mainSourceDir)).toBe(mainHadSourceBefore);
    },
    CLEAN_WORKTREE_FIXTURE_TEST_TIMEOUT_MS,
  );
});
