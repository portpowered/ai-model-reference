import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { httpGetText } from "./http-harness";
import {
  runStaticExportServerLifecycle,
  type StaticExportServerLifecycleOutcome,
} from "./static-export-server-lifecycle";

function writeOutFixture(rootDir: string): void {
  writeFileSync(join(rootDir, "index.html"), "<html>home</html>");
}

describe("runStaticExportServerLifecycle", () => {
  test("returns pass after the home route becomes ready and tears down cleanly", async () => {
    const root = mkdtempSync(join(tmpdir(), "static-export-lifecycle-pass-"));
    writeOutFixture(root);

    const outcome = await runStaticExportServerLifecycle({
      outDir: root,
      port: 3190,
    });

    expect(outcome.status).toBe("pass");
    if (outcome.status !== "pass") {
      return;
    }

    const home = await httpGetText(`${outcome.baseUrl}/`);
    expect(home.status).toBe(200);
    expect(home.body).toContain("home");

    await outcome.session.cleanup();
    rmSync(root, { recursive: true, force: true });
  });

  test("fails when out/ is missing", async () => {
    const missingDir = join(
      tmpdir(),
      `static-export-lifecycle-missing-${Date.now()}`,
    );
    const outcome = await runStaticExportServerLifecycle({
      outDir: missingDir,
    });

    expect(outcome.status).toBe("fail");
    if (outcome.status === "fail") {
      expect(outcome.reason).toContain("Missing export directory");
      expect(outcome.reason).toContain(missingDir);
    }
  });

  test("fails on readiness timeout when index.html is absent", async () => {
    const root = mkdtempSync(
      join(tmpdir(), "static-export-lifecycle-timeout-"),
    );
    mkdirSync(root, { recursive: true });

    const outcome = await runStaticExportServerLifecycle({
      outDir: root,
      port: 3191,
      startupTimeoutMs: 500,
    });

    expect(outcome.status).toBe("fail");
    if (outcome.status === "fail") {
      expect(outcome.reason).toMatch(/did not become ready|Expected HTTP 200/i);
    }

    rmSync(root, { recursive: true, force: true });
  });

  test("honors GITHUB_PAGES_BASE_PATH when serving the home route", async () => {
    const root = mkdtempSync(
      join(tmpdir(), "static-export-lifecycle-basepath-"),
    );
    writeOutFixture(root);

    const outcome = await runStaticExportServerLifecycle({
      outDir: root,
      basePath: "/learn-language-models",
      port: 3192,
    });

    expect(outcome.status).toBe("pass");
    if (outcome.status !== "pass") {
      return;
    }

    expect(outcome.baseUrl).toBe("http://127.0.0.1:3192/learn-language-models");

    const home = await httpGetText(`${outcome.baseUrl}/`);
    expect(home.status).toBe(200);
    expect(home.body).toContain("home");

    await outcome.session.cleanup();
    rmSync(root, { recursive: true, force: true });
  });

  test("cleanup stops serving responses after teardown", async () => {
    const root = mkdtempSync(
      join(tmpdir(), "static-export-lifecycle-teardown-"),
    );
    writeOutFixture(root);

    const outcome: StaticExportServerLifecycleOutcome =
      await runStaticExportServerLifecycle({
        outDir: root,
        port: 3193,
      });

    expect(outcome.status).toBe("pass");
    if (outcome.status !== "pass") {
      return;
    }

    const port = outcome.session.port;
    await outcome.session.cleanup();

    await expect(httpGetText(`http://127.0.0.1:${port}/`)).rejects.toThrow();

    rmSync(root, { recursive: true, force: true });
  });
});
