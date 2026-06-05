export const PHASE_1_CONVERGENCE_PASS_CI_REPORT_HEADER =
  "Phase 1 batch-009 CI blocker domain report";

export type Phase1Batch009BlockerDomainId =
  | "gqa-module-graph-build-markers"
  | "docs-footer-hover-focus-parity"
  | "phase-1-route-gate";

export type Phase1CiBlockerDomainStatus = "pass" | "fail";

export type Phase1CiBlockerDomainDefinition = {
  id: Phase1Batch009BlockerDomainId;
  label: string;
  checklistRow: string;
  ciAssertionNames: readonly string[];
  failurePatterns: readonly RegExp[];
};

export type Phase1CiBlockerDomainEvidence = {
  domainId: Phase1Batch009BlockerDomainId;
  label: string;
  checklistRow: string;
  status: Phase1CiBlockerDomainStatus;
  ciAssertionNames: readonly string[];
  reason?: string;
};

/** Batch-009 blocker domains observable from `make ci` output. */
export const PHASE_1_BATCH_009_CI_DOMAIN_DEFINITIONS: readonly Phase1CiBlockerDomainDefinition[] =
  [
    {
      id: "gqa-module-graph-build-markers",
      label: "Grouped-query-attention module graph build markers",
      checklistRow: "phase-1-module-page",
      ciAssertionNames: [
        "verify-grouped-query-attention-built-route",
        "grouped-query-attention built route convergence",
        "grouped-query-attention-module-convergence",
      ],
      failurePatterns: [
        /Grouped-query-attention built route convergence verification failed/i,
        /grouped-query-attention built route convergence/i,
        /grouped-query-attention-module-convergence/i,
        /verify-grouped-query-attention-built-route/i,
      ],
    },
    {
      id: "docs-footer-hover-focus-parity",
      label: "Docs footer hover/focus CSS parity",
      checklistRow: "phase-1-docs-footer",
      ciAssertionNames: [
        "docs page footer hover convergence",
        "docs-page-footer-hover-convergence",
        "footer sublabel hover/focus inherit",
      ],
      failurePatterns: [
        /docs page footer hover convergence/i,
        /docs-page-footer-hover-convergence/i,
        /footer sublabel hover\/focus inherit/i,
        /bundled app CSS missing footer sublabel hover\/focus inherit rule pairing/i,
      ],
    },
    {
      id: "phase-1-route-gate",
      label:
        "Phase 1 home/search/glossary/tag/module route gate (CI build checks)",
      checklistRow: "phase-1-route-gate",
      ciAssertionNames: [
        "verify-phase-1-static-routes",
        "phase-1-shell-contract",
        "phase-1-route-modules",
        "home-search-entry-convergence",
        "tags-navigation-convergence",
      ],
      failurePatterns: [
        /verify-phase-1-static-routes/i,
        /phase-1-shell-contract/i,
        /phase-1-route-modules/i,
        /home-search-entry-convergence/i,
        /tags-navigation-convergence/i,
        /Phase 1 static route/i,
      ],
    },
  ] as const;

function findDomainFailureReason(
  output: string,
  patterns: readonly RegExp[],
): string | undefined {
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    if (patterns.some((pattern) => pattern.test(line))) {
      return line.trim();
    }
  }

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match?.[0]) {
      return match[0].trim();
    }
  }

  return undefined;
}

/**
 * Derives batch-009 blocker domain pass/fail evidence from captured `make ci`
 * output. When CI passed, every domain is pass. When CI failed, a domain is
 * fail only when its CI-visible failure patterns match.
 */
export function derivePhase1CiBlockerDomainEvidence(
  ciOutput: string,
  ciPassed: boolean,
): Phase1CiBlockerDomainEvidence[] {
  return PHASE_1_BATCH_009_CI_DOMAIN_DEFINITIONS.map((definition) => {
    if (ciPassed) {
      return {
        domainId: definition.id,
        label: definition.label,
        checklistRow: definition.checklistRow,
        status: "pass",
        ciAssertionNames: definition.ciAssertionNames,
      };
    }

    const reason = findDomainFailureReason(
      ciOutput,
      definition.failurePatterns,
    );
    if (reason) {
      return {
        domainId: definition.id,
        label: definition.label,
        checklistRow: definition.checklistRow,
        status: "fail",
        ciAssertionNames: definition.ciAssertionNames,
        reason,
      };
    }

    return {
      domainId: definition.id,
      label: definition.label,
      checklistRow: definition.checklistRow,
      status: "pass",
      ciAssertionNames: definition.ciAssertionNames,
    };
  });
}

export function formatPhase1CiBlockerDomainLine(
  evidence: Phase1CiBlockerDomainEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const assertions = evidence.ciAssertionNames.join(", ");
  const reason =
    evidence.status === "fail" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label} (source=make ci, assertions=${assertions})${reason} — checklistRow=${evidence.checklistRow}`;
}

export function formatPhase1CiBlockerDomainReport(
  evidence: readonly Phase1CiBlockerDomainEvidence[],
): string {
  const lines = evidence.map((row) => formatPhase1CiBlockerDomainLine(row));
  return [PHASE_1_CONVERGENCE_PASS_CI_REPORT_HEADER, ...lines].join("\n");
}

export type PrintPhase1CiBlockerDomainReportOptions = {
  writeLine?: (line: string) => void;
};

export function printPhase1CiBlockerDomainReport(
  evidence: readonly Phase1CiBlockerDomainEvidence[],
  options: PrintPhase1CiBlockerDomainReportOptions = {},
): void {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  for (const line of formatPhase1CiBlockerDomainReport(evidence).split("\n")) {
    writeLine(line);
  }
}

export type Phase1ConvergencePassExitInput = {
  ciExitCode: number;
  verifyExitCode: number;
};

/**
 * Combined convergence pass exit semantics: fail when CI or built-app verifier
 * fails. Uncertain customer-ask rows remain non-blocking inside verify.
 */
export function getPhase1ConvergencePassExitCode(
  input: Phase1ConvergencePassExitInput,
): 0 | 1 {
  if (input.ciExitCode !== 0 || input.verifyExitCode !== 0) {
    return 1;
  }
  return 0;
}

export const PHASE_1_CONVERGENCE_PASS_WORKFLOW_STEPS = [
  "make ci",
  "make build && make verify-phase-1-ux",
] as const;

export const PHASE_1_CONVERGENCE_PASS_PREREQUISITES = [
  "Bun dependencies installed (`bun install`)",
  "Playwright Chromium for live browser checks (`npx playwright install chromium`)",
  "Production build output (`.next/`) produced by `make build` inside the workflow",
] as const;
