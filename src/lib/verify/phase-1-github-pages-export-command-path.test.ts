import { describe, expect, test } from "bun:test";
import {
  deriveExportCommandPathEvidence,
  EXPORT_BUILD_SUCCESS_ROUTE_MARKER,
  EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER,
  EXPORT_COMMAND_PATH_DOMAIN_ID,
  formatExportCommandPathEvidenceLine,
} from "./phase-1-github-pages-export-command-path";

function successfulBuildExportOutput(): string {
  return [
    "Static export build complete.",
    `${EXPORT_BUILD_SUCCESS_ROUTE_MARKER} (7 paths in out).`,
    `${EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER} (3 queries in out).`,
  ].join("\n");
}

describe("deriveExportCommandPathEvidence", () => {
  test("returns pass when build-export succeeds with canonical success markers", () => {
    const evidence = deriveExportCommandPathEvidence({
      output: successfulBuildExportOutput(),
      exitCode: 0,
    });

    expect(evidence.domainId).toBe(EXPORT_COMMAND_PATH_DOMAIN_ID);
    expect(evidence.status).toBe("pass");
    expect(evidence.reason).toBeUndefined();
  });

  test("returns fail when export route verification fails", () => {
    const evidence = deriveExportCommandPathEvidence({
      output: [
        "Static export build complete.",
        "Phase 1 export route verification failed:",
        "  missing exported HTML for /docs/modules/grouped-query-attention",
      ].join("\n"),
      exitCode: 1,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain(
      "Phase 1 export route verification failed",
    );
  });

  test("returns fail when export search handoff verification fails", () => {
    const evidence = deriveExportCommandPathEvidence({
      output: [
        `${EXPORT_BUILD_SUCCESS_ROUTE_MARKER} (7 paths in out).`,
        "Phase 1 static export search handoff verification failed:",
        "  GQA query missing from static search index",
      ].join("\n"),
      exitCode: 1,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain(
      "Phase 1 static export search handoff verification failed",
    );
  });

  test("returns fail when build-export exits non-zero without known failure markers", () => {
    const evidence = deriveExportCommandPathEvidence({
      output: "make: *** [build-export] Error 2\n",
      exitCode: 2,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("make");
  });

  test("returns uncertain when exit code is zero but success markers are missing", () => {
    const evidence = deriveExportCommandPathEvidence({
      output: "Static export build complete.\n",
      exitCode: 0,
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("success markers");
  });
});

describe("formatExportCommandPathEvidenceLine", () => {
  test("formats pass without reason and fail with reason", () => {
    const passLine = formatExportCommandPathEvidenceLine(
      deriveExportCommandPathEvidence({
        output: successfulBuildExportOutput(),
        exitCode: 0,
      }),
    );
    const failLine = formatExportCommandPathEvidenceLine(
      deriveExportCommandPathEvidence({
        output: "Phase 1 export route verification failed:\n",
        exitCode: 1,
      }),
    );

    expect(passLine).toContain("[PASS] export-command-path");
    expect(passLine).toContain(
      "checklistRow=phase-1-github-pages-export-command-path",
    );
    expect(failLine).toContain("[FAIL] export-command-path");
    expect(failLine).toContain("Phase 1 export route verification failed");
  });
});
