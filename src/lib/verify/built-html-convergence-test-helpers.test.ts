import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readBuiltHtmlForConvergenceTests,
  shouldRunBuiltHtmlFileConvergenceTests,
} from "./built-html-convergence-test-helpers";
import { VERIFY_COVERAGE_SUBPROCESS_ENV } from "./server-lifecycle";

describe("built-html convergence test helpers", () => {
  let projectRoot = "";

  afterEach(() => {
    if (projectRoot) {
      rmSync(projectRoot, { recursive: true, force: true });
      projectRoot = "";
    }
  });

  test("skips built HTML reads during the coverage subprocess rerun", () => {
    projectRoot = mkdtempSync(join(tmpdir(), "built-html-gate-"));
    mkdirSync(join(projectRoot, ".next", "server", "app"), {
      recursive: true,
    });
    writeFileSync(join(projectRoot, ".next", "BUILD_ID"), "test-build");
    writeFileSync(
      join(projectRoot, ".next", "server", "app", "index.html"),
      "<html></html>",
    );

    expect(
      shouldRunBuiltHtmlFileConvergenceTests(projectRoot, {
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
    expect(
      readBuiltHtmlForConvergenceTests(
        ".next/server/app/index.html",
        projectRoot,
        { [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1" },
      ),
    ).toBeNull();
  });

  test("reads built HTML when a complete production build is present", () => {
    projectRoot = mkdtempSync(join(tmpdir(), "built-html-ready-"));
    mkdirSync(join(projectRoot, ".next", "server", "app"), {
      recursive: true,
    });
    writeFileSync(join(projectRoot, ".next", "BUILD_ID"), "test-build");
    writeFileSync(
      join(projectRoot, ".next", "server", "app", "index.html"),
      "<html>ready</html>",
    );

    expect(shouldRunBuiltHtmlFileConvergenceTests(projectRoot)).toBe(true);
    expect(
      readBuiltHtmlForConvergenceTests(
        ".next/server/app/index.html",
        projectRoot,
      ),
    ).toBe("<html>ready</html>");
  });
});
