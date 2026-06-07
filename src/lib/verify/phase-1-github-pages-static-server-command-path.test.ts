import { describe, expect, test } from "bun:test";
import {
  deriveStaticServerCommandPathEvidence,
  formatStaticServerCommandPathEvidenceLine,
  STATIC_SERVER_COMMAND_PATH_CHECKLIST_ROW,
  STATIC_SERVER_COMMAND_PATH_DOMAIN_ID,
} from "./phase-1-github-pages-static-server-command-path";

describe("deriveStaticServerCommandPathEvidence", () => {
  test("marks pass when the static export server lifecycle succeeds", () => {
    const evidence = deriveStaticServerCommandPathEvidence({
      lifecycleStatus: "pass",
    });

    expect(evidence.domainId).toBe(STATIC_SERVER_COMMAND_PATH_DOMAIN_ID);
    expect(evidence.status).toBe("pass");
    expect(evidence.checklistRow).toBe(
      STATIC_SERVER_COMMAND_PATH_CHECKLIST_ROW,
    );
  });

  test("marks fail with lifecycle reason when readiness fails", () => {
    const evidence = deriveStaticServerCommandPathEvidence({
      lifecycleStatus: "fail",
      lifecycleReason:
        "Static export file server did not become ready within 30000ms",
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("did not become ready");
  });

  test("marks uncertain when static server verification is skipped upstream", () => {
    const evidence = deriveStaticServerCommandPathEvidence({
      skipped: true,
      skipReason:
        "Static export server verification skipped because make build-export did not succeed.",
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("make build-export did not succeed");
  });
});

describe("formatStaticServerCommandPathEvidenceLine", () => {
  test("formats pass and fail domain rows", () => {
    const passLine = formatStaticServerCommandPathEvidenceLine(
      deriveStaticServerCommandPathEvidence({ lifecycleStatus: "pass" }),
    );
    const failLine = formatStaticServerCommandPathEvidenceLine(
      deriveStaticServerCommandPathEvidence({
        lifecycleStatus: "fail",
        lifecycleReason: "Missing export directory at out",
      }),
    );

    expect(passLine).toContain("[PASS] static-server-command-path");
    expect(passLine).toContain(
      `checklistRow=${STATIC_SERVER_COMMAND_PATH_CHECKLIST_ROW}`,
    );
    expect(failLine).toContain("[FAIL] static-server-command-path");
    expect(failLine).toContain("Missing export directory at out");
  });
});
