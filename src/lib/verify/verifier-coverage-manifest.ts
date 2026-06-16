/**
 * Shared verifier modules subject to the manifest-driven coverage gate.
 * Update this manifest when adding or extending verifier lifecycle harness modules.
 */
export type VerifierCoverageEntry = {
  /** Repo-relative source path */
  file: string;
  /** Human label for docs and failure messages */
  label: string;
  /** Minimum reachable line coverage (Bun `bun test --coverage` line %) */
  minReachableLinePercent: number;
  /** Module or script tests that exercise the verifier surface */
  unitTests: string[];
};

/** Phase 1 built-app verifier lifecycle harness modules. */
export const VERIFIER_COVERAGE_MODULES: VerifierCoverageEntry[] = [
  {
    file: "src/lib/verify/server-lifecycle.ts",
    label: "Verify server lifecycle",
    minReachableLinePercent: 90,
    unitTests: [
      "src/lib/verify/server-lifecycle.test.ts",
      "src/lib/verify/reader-ux-verifier.test.ts",
    ],
  },
];
