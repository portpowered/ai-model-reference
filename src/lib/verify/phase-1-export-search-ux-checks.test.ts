import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  CI_EXPORT_SEARCH_UX_PROBE_QUERIES,
  EXPORT_SEARCH_UX_STUB_ENV,
  formatPhase1ExportSearchUxCheckFailure,
  resolveCiExportSearchUxProbeQueries,
  resolveExportSearchUxCheckOptionsFromEnv,
  runPhase1ExportSearchUxChecks,
} from "./phase-1-export-search-ux-checks";
import { PHASE_1_SEARCH_PAGE_QUERIES } from "./phase-1-search-page-checks";

describe("resolveCiExportSearchUxProbeQueries", () => {
  test("keeps explicit query lists", () => {
    expect(resolveCiExportSearchUxProbeQueries(["attention"])).toEqual([
      "attention",
    ]);
  });

  test("defaults to all Phase 1 queries outside CI", () => {
    const previousCi = process.env.CI;
    const previousActions = process.env.GITHUB_ACTIONS;
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    try {
      expect(resolveCiExportSearchUxProbeQueries()).toEqual(
        PHASE_1_SEARCH_PAGE_QUERIES,
      );
    } finally {
      if (previousCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = previousCi;
      }
      if (previousActions === undefined) {
        delete process.env.GITHUB_ACTIONS;
      } else {
        process.env.GITHUB_ACTIONS = previousActions;
      }
    }
  });

  test("defaults to GQA-only probes under CI", () => {
    const previousCi = process.env.CI;
    process.env.CI = "true";
    try {
      expect(resolveCiExportSearchUxProbeQueries()).toEqual(
        CI_EXPORT_SEARCH_UX_PROBE_QUERIES,
      );
    } finally {
      if (previousCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = previousCi;
      }
    }
  });
});

describe("resolveExportSearchUxCheckOptionsFromEnv", () => {
  test("returns stub hooks when VERIFY_EXPORT_SEARCH_UX_STUB=pass", () => {
    const options = resolveExportSearchUxCheckOptionsFromEnv({
      [EXPORT_SEARCH_UX_STUB_ENV]: "pass",
    });
    expect(options.searchPageOptions?.runQueryCheck).toBeDefined();
    expect(options.searchDialogOptions?.runQueryCheck).toBeDefined();
  });
});

describe("runPhase1ExportSearchUxChecks", () => {
  test("reports missing export directory", async () => {
    const failures = await runPhase1ExportSearchUxChecks({
      outDir: "missing-export-dir-for-test",
      cwd: mkdtempSync(join(tmpdir(), "export-ux-missing-")),
      searchPageOptions: { runQueryCheck: async () => null },
      searchDialogOptions: { runQueryCheck: async () => null },
    });

    expect(failures).toHaveLength(1);
    expect(failures[0]?.surface).toBe("export-artifact");
    expect(failures[0]?.reason).toContain("Missing export directory");
  });

  test(
    "passes when export bootstrap exists and stubbed browser checks succeed",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "export-ux-pass-"));
      mkdirSync(join(root, "api"), { recursive: true });
      const exported = await (await docsSearchApi.staticGET()).json();
      writeFileSync(join(root, "api", "search"), JSON.stringify(exported));
      writeFileSync(join(root, "index.html"), "<html></html>");

      try {
        const failures = await runPhase1ExportSearchUxChecks({
          outDir: root,
          cwd: root,
          searchPageOptions: { runQueryCheck: async () => null },
          searchDialogOptions: { runQueryCheck: async () => null },
        });
        expect(failures).toEqual([]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 30_000 },
  );
});

describe("formatPhase1ExportSearchUxCheckFailure", () => {
  test("includes surface and reason", () => {
    expect(
      formatPhase1ExportSearchUxCheckFailure({
        surface: "/search",
        reason: "timed out",
      }),
    ).toBe("/search: timed out");
  });
});
