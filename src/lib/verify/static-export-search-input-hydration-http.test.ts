import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import { buildSearchPageExportShellStubBody } from "./phase-1-search-export-shell-checks";
import { createStaticExportHttpServer } from "./static-export-http-server";
import {
  evaluateSearchPageInputHydrationAfterTyping,
  evaluateSearchPageInputHydrationBeforeQuery,
  evaluateSearchPageInputHydrationOutcome,
  verifyStaticExportSearchInputHydration,
} from "./static-export-search-input-hydration-http";

function writeSearchExportFixture(rootDir: string): void {
  const outDir = join(rootDir, "out");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "search.html"),
    `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
    { encoding: "utf8" },
  );
}

describe("evaluateSearchPageInputHydrationBeforeQuery", () => {
  test("passes when the input and idle state are visible", () => {
    expect(
      evaluateSearchPageInputHydrationBeforeQuery({
        inputVisible: true,
        inputFocused: false,
        inputValue: "",
        idleVisible: true,
        loadingVisible: false,
        resultsVisible: false,
        emptyVisible: false,
      }),
    ).toBeNull();
  });

  test("fails when the input is not visible", () => {
    expect(
      evaluateSearchPageInputHydrationBeforeQuery({
        inputVisible: false,
        inputFocused: false,
        inputValue: "",
        idleVisible: true,
        loadingVisible: false,
        resultsVisible: false,
        emptyVisible: false,
      }),
    ).toContain("search input is not visible");
  });

  test("fails when idle is hidden before query entry", () => {
    expect(
      evaluateSearchPageInputHydrationBeforeQuery({
        inputVisible: true,
        inputFocused: false,
        inputValue: "",
        idleVisible: false,
        loadingVisible: false,
        resultsVisible: false,
        emptyVisible: false,
      }),
    ).toContain("idle state is not visible");
  });
});

describe("evaluateSearchPageInputHydrationAfterTyping", () => {
  test("passes when the input value updates and idle disappears", () => {
    expect(
      evaluateSearchPageInputHydrationAfterTyping(
        {
          inputVisible: true,
          inputFocused: true,
          inputValue: "GQA",
          idleVisible: false,
          loadingVisible: true,
          resultsVisible: false,
          emptyVisible: false,
        },
        "GQA",
      ),
    ).toBeNull();
  });

  test("fails when the input value does not match the typed query", () => {
    expect(
      evaluateSearchPageInputHydrationAfterTyping(
        {
          inputVisible: true,
          inputFocused: true,
          inputValue: "",
          idleVisible: false,
          loadingVisible: false,
          resultsVisible: false,
          emptyVisible: false,
        },
        "GQA",
      ),
    ).toContain('did not update to "GQA"');
  });

  test("fails when idle remains visible after typing", () => {
    expect(
      evaluateSearchPageInputHydrationAfterTyping(
        {
          inputVisible: true,
          inputFocused: true,
          inputValue: "GQA",
          idleVisible: true,
          loadingVisible: false,
          resultsVisible: false,
          emptyVisible: false,
        },
        "GQA",
      ),
    ).toContain("idle state remained visible");
  });
});

describe("evaluateSearchPageInputHydrationOutcome", () => {
  test("passes for loading, results, or empty outcomes", () => {
    expect(
      evaluateSearchPageInputHydrationOutcome({
        inputVisible: true,
        inputFocused: true,
        inputValue: "GQA",
        idleVisible: false,
        loadingVisible: true,
        resultsVisible: false,
        emptyVisible: false,
      }),
    ).toBeNull();
    expect(
      evaluateSearchPageInputHydrationOutcome({
        inputVisible: true,
        inputFocused: true,
        inputValue: "GQA",
        idleVisible: false,
        loadingVisible: false,
        resultsVisible: true,
        emptyVisible: false,
      }),
    ).toBeNull();
    expect(
      evaluateSearchPageInputHydrationOutcome({
        inputVisible: true,
        inputFocused: true,
        inputValue: "GQA",
        idleVisible: false,
        loadingVisible: false,
        resultsVisible: false,
        emptyVisible: true,
      }),
    ).toBeNull();
  });

  test("fails when no outcome region appears", () => {
    expect(
      evaluateSearchPageInputHydrationOutcome({
        inputVisible: true,
        inputFocused: true,
        inputValue: "GQA",
        idleVisible: false,
        loadingVisible: false,
        resultsVisible: false,
        emptyVisible: false,
      }),
    ).toContain("no loading, results, or empty outcome");
  });
});

describe("verifyStaticExportSearchInputHydration", () => {
  test(
    "returns a failure reason when export HTML lacks the search input shell",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }
      const root = mkdtempSync(join(tmpdir(), "search-hydration-missing-"));
      const outDir = join(root, "out");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, "search.html"),
        "<html><body>Search</body></html>",
      );

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportSearchInputHydration(
          server.baseUrl,
          {
            timeoutMs: 5_000,
          },
        );
        expect(reason).toMatch(/search-page-input|Search Model Atlas/);
      } finally {
        await server.cleanup();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 15_000 },
  );

  test(
    "returns a failure reason when SSR shell exists but the input never hydrates",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }
      const root = mkdtempSync(join(tmpdir(), "search-hydration-static-"));
      writeSearchExportFixture(root);

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportSearchInputHydration(
          server.baseUrl,
          {
            timeoutMs: 5_000,
          },
        );
        expect(reason).toMatch(
          /did not update|idle state remained visible|no loading, results, or empty outcome|timed out waiting/,
        );
      } finally {
        await server.cleanup();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 15_000 },
  );
});
