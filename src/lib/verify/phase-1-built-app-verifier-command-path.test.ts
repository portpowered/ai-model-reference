import { describe, expect, test } from "bun:test";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  deriveVerifierCommandPathEvidence,
  formatVerifierCommandPathEvidenceLine,
  VERIFIER_COMMAND_PATH_DOMAIN_ID,
} from "./phase-1-built-app-verifier-command-path";
import { PHASE_1_UX_SUCCESS_MESSAGE } from "./phase-1-ux-verifier";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

const PASS_ROW: CustomerAskConvergenceRow = {
  checkId: "home.header-search-entry",
  title: "Home exposes header-only search entry",
  status: "pass",
  route: "/",
  checklistRow: "phase-1-home-header-polish",
};

const FAIL_ROW: CustomerAskConvergenceRow = {
  checkId: "docs.footer-hover-focus-parity",
  title:
    "Docs footer previous/next sublabels inherit accent foreground on hover and focus-visible",
  status: "fail",
  route: "/docs/glossary/token",
  reason:
    "bundled app CSS missing footer sublabel hover/focus inherit rule pairing",
  checklistRow: "phase-1-docs-footer",
};

function outputWithReport(rows: CustomerAskConvergenceRow[]): string {
  return `${formatCustomerAskConvergenceReport(rows)}\n`;
}

describe("deriveVerifierCommandPathEvidence", () => {
  test("passes when customer-ask report is present on the default spawn path", () => {
    const evidence = deriveVerifierCommandPathEvidence({
      output: outputWithReport([PASS_ROW]),
    });

    expect(evidence.domainId).toBe(VERIFIER_COMMAND_PATH_DOMAIN_ID);
    expect(evidence.status).toBe("pass");
    expect(evidence.reason).toBeUndefined();
  });

  test("passes when checks fail but lifecycle completed and printed the report", () => {
    const evidence = deriveVerifierCommandPathEvidence({
      output: `${PHASE_1_UX_SUCCESS_MESSAGE}\n${outputWithReport([PASS_ROW, FAIL_ROW])}`,
    });

    expect(evidence.status).toBe("pass");
    expect(evidence.reason).toBeUndefined();
  });

  test("fails with stable reason when production build is missing", () => {
    const evidence = deriveVerifierCommandPathEvidence({
      output: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toBe(NEXT_BUILD_REQUIRED_MESSAGE);
  });

  test("fails with stable reason when server startup times out", () => {
    const timeoutMessage =
      "Server did not become ready within 800ms (port 3456, health URL http://127.0.0.1:3456/): Expected HTTP 200, got 503";
    const evidence = deriveVerifierCommandPathEvidence({
      output: `${timeoutMessage}\n`,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toBe(timeoutMessage);
  });

  test("fails with stable reason when the spawned server exits before readiness", () => {
    const earlyExitMessage =
      "Production server exited before becoming ready (port 3456, health URL http://127.0.0.1:3456/) (exit code 42)\nChild output tail:\nfatal production boot error";
    const evidence = deriveVerifierCommandPathEvidence({
      output: `${earlyExitMessage}\n`,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("exited before becoming ready");
    expect(evidence.reason).toContain("exit code 42");
  });

  test("fails when no free verify port is available", () => {
    const portMessage = "No free port on 127.0.0.1 in 3100-3999";
    const evidence = deriveVerifierCommandPathEvidence({
      output: `${portMessage}\n`,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toBe(portMessage);
  });

  test("is uncertain when VERIFY_BASE_URL was set even if the report printed", () => {
    const evidence = deriveVerifierCommandPathEvidence({
      output: outputWithReport([PASS_ROW]),
      verifyBaseUrl: "http://127.0.0.1:3456",
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("VERIFY_BASE_URL was set");
  });

  test("is uncertain when output lacks report and lifecycle failure signals", () => {
    const evidence = deriveVerifierCommandPathEvidence({
      output: "Phase 1 route verification failed: missing marker\n",
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("cannot distinguish command-path health");
  });
});

describe("formatVerifierCommandPathEvidenceLine", () => {
  test("formats pass and fail rows with checklistRow", () => {
    const passLine = formatVerifierCommandPathEvidenceLine(
      deriveVerifierCommandPathEvidence({
        output: outputWithReport([PASS_ROW]),
      }),
    );
    const failLine = formatVerifierCommandPathEvidenceLine(
      deriveVerifierCommandPathEvidence({
        output: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      }),
    );

    expect(passLine).toContain("[PASS] verifier-command-path");
    expect(passLine).toContain(
      "checklistRow=phase-1-built-app-verifier-harness",
    );
    expect(failLine).toContain("[FAIL] verifier-command-path");
    expect(failLine).toContain(NEXT_BUILD_REQUIRED_MESSAGE);
  });
});
