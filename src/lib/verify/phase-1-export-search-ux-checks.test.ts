import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXPORT_SEARCH_HYDRATION_SURFACE } from "./phase-1-export-search-convergence-evidence";
import {
  CI_EXPORT_SEARCH_UX_PROBE_QUERIES,
  EXPORT_SEARCH_UX_STUB_ENV,
  formatPhase1ExportSearchHydrationUxReason,
  formatPhase1ExportSearchUxCheckFailure,
  resolveCiExportSearchUxProbeQueries,
  resolveExportSearchUxCheckOptionsFromEnv,
  runPhase1ExportSearchUxChecks,
} from "./phase-1-export-search-ux-checks";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import { PHASE_1_SEARCH_PAGE_QUERIES } from "./phase-1-search-page-checks";
import { VERIFY_COVERAGE_SUBPROCESS_ENV } from "./server-lifecycle";

describe("resolveCiExportSearchUxProbeQueries", () => {
  const originalCoverageSubprocess = process.env[VERIFY_COVERAGE_SUBPROCESS_ENV];

  beforeEach(() => {
    delete process.env[VERIFY_COVERAGE_SUBPROCESS_ENV];
  });

  afterEach(() => {
    if (originalCoverageSubprocess === undefined) {
      delete process.env[VERIFY_COVERAGE_SUBPROCESS_ENV];
    } else {
      process.env[VERIFY_COVERAGE_SUBPROCESS_ENV] = originalCoverageSubprocess;
    }
  });

  test("keeps explicit query lists", () => {
    expect(resolveCiExportSearchUxProbeQueries(["attention"])).toEqual([
      "attention",
    ]);
  });

  test("defaults to GQA-only probes under probe serialization", () => {
    expect(resolveCiExportSearchUxProbeQueries()).toEqual(
      CI_EXPORT_SEARCH_UX_PROBE_QUERIES,
    );
  });

  test("defaults to all Phase 1 queries when probe serialization is off", () => {
    const previousCoverage = process.env[VERIFY_COVERAGE_SUBPROCESS_ENV];
    process.env[VERIFY_COVERAGE_SUBPROCESS_ENV] = "1";
    try {
      expect(resolveCiExportSearchUxProbeQueries()).toEqual(
        PHASE_1_SEARCH_PAGE_QUERIES,
      );
    } finally {
      if (previousCoverage === undefined) {
        delete process.env[VERIFY_COVERAGE_SUBPROCESS_ENV];
      } else {
        process.env[VERIFY_COVERAGE_SUBPROCESS_ENV] = previousCoverage;
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
      writeFileSync(
        join(root, "api", "search"),
        JSON.stringify({
          type: "advanced",
          documents: [{ url: PHASE_1_GROUPED_QUERY_ATTENTION_URL }],
        }),
      );
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

describe("formatPhase1ExportSearchHydrationUxReason", () => {
  test("prefixes hydration surface for /search DOM outcomes", () => {
    expect(
      formatPhase1ExportSearchHydrationUxReason(
        'no search results rendered on /search for query "attention"',
      ),
    ).toBe(
      `${EXPORT_SEARCH_HYDRATION_SURFACE} — no search results rendered on /search for query "attention"`,
    );
  });
});

describe("formatPhase1ExportSearchUxCheckFailure", () => {
  test("tags export-artifact failures by surface", () => {
    expect(
      formatPhase1ExportSearchUxCheckFailure({
        surface: "export-artifact",
        reason: "Missing export directory at out",
      }),
    ).toBe("export-artifact: Missing export directory at out");
  });

  test("includes query and hydration label for /search failures", () => {
    expect(
      formatPhase1ExportSearchUxCheckFailure({
        surface: "/search",
        query: "attention",
        reason: formatPhase1ExportSearchHydrationUxReason(
          'no search results rendered on /search for query "attention"',
        ),
      }),
    ).toBe(
      `/search?query=attention: ${EXPORT_SEARCH_HYDRATION_SURFACE} — no search results rendered on /search for query "attention"`,
    );
  });

  test("includes query for header-dialog failures", () => {
    expect(
      formatPhase1ExportSearchUxCheckFailure({
        surface: "header-dialog",
        query: "GQA",
        reason: "empty results state",
      }),
    ).toBe("header-dialog?query=GQA: empty results state");
  });
});

describe("runPhase1ExportSearchUxChecks hydration failures", () => {
  test("returns per-query /search failures with hydration reasons", async () => {
    const root = mkdtempSync(join(tmpdir(), "export-ux-hydration-fail-"));
    mkdirSync(join(root, "api"), { recursive: true });
    writeFileSync(
      join(root, "api", "search"),
      JSON.stringify({
        type: "advanced",
        documents: [{ url: PHASE_1_GROUPED_QUERY_ATTENTION_URL }],
      }),
    );
    writeFileSync(join(root, "index.html"), "<html></html>");

    try {
      const failures = await runPhase1ExportSearchUxChecks({
        outDir: root,
        cwd: root,
        searchPageOptions: {
          queries: ["attention"],
          runQueryCheck: async (_baseUrl, query) =>
            `no search results rendered on /search for query "${query}"`,
        },
        searchDialogOptions: { runQueryCheck: async () => null },
      });

      expect(failures).toHaveLength(1);
      const failure = failures[0];
      expect(failure?.surface).toBe("/search");
      expect(failure?.query).toBe("attention");
      expect(failure?.reason).toContain(EXPORT_SEARCH_HYDRATION_SURFACE);
      if (!failure) {
        throw new Error("expected one /search hydration failure");
      }
      expect(formatPhase1ExportSearchUxCheckFailure(failure)).toMatch(
        /\/search\?query=attention:/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
