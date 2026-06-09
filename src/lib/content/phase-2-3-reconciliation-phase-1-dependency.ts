/**
 * Phase 2/3 reconciliation dependency on Phase 1 static-export search repair.
 * Story 013 records assessment only — do not implement repairs here.
 *
 * Human-readable detail: docs/phase-2-3-reconciliation-implementation-notes.md
 */

export const PHASE_2_3_RECONCILIATION_IMPLEMENTATION_NOTES_PATH =
  "docs/phase-2-3-reconciliation-implementation-notes.md";

/** Reconciliation does not block on open static-export search repair (verified 2026-06-09 UTC). */
export const PHASE_2_3_RECONCILIATION_DEPENDS_ON_PHASE_1_STATIC_EXPORT_REPAIR = false;

/**
 * Path prefixes owned by the active Phase 1 static-export search repair path.
 * Reconciliation work must not modify these files.
 */
export const PHASE_1_STATIC_EXPORT_REPAIR_OWNED_PATH_PREFIXES = [
  "src/lib/verify/static-export-",
  "src/lib/verify/phase-1-github-pages-",
  "src/tests/build/static-export-",
  "scripts/verify-phase-1-export-",
  "scripts/run-phase-1-github-pages-",
  "factory/docs/phase-1-github-pages-",
] as const;

export type Phase23ResidualPhase1Blocker = {
  track: "phase-1-built-app-convergence";
  summary: string;
  exampleCheckIds: readonly string[];
  verificationCommands: readonly string[];
};

/**
 * Inherited Phase 1 failures that can appear in full `make test` but are outside
 * static-export repair and outside the Phase 2/3 reconciliation gate.
 */
export const PHASE_2_3_RECONCILIATION_RESIDUAL_PHASE_1_BLOCKERS: readonly Phase23ResidualPhase1Blocker[] =
  [
    {
      track: "phase-1-built-app-convergence",
      summary:
        "Spawned next start customer-ask search UX rows can fail while GitHub Pages static export passes.",
      exampleCheckIds: [
        "search.page.page-level-hits",
        "search.page.row-hover-coherence",
        "search.page.matched-text-selection-contrast",
        "search.inline-result-no-list-decoration",
        "customer-ask-convergence",
      ],
      verificationCommands: [
        "make verify-phase-1-built-app-convergence",
        "make verify-phase-1-follow-up-convergence",
        "make verify-phase-1-ux",
      ],
    },
    {
      track: "phase-1-built-app-convergence",
      summary:
        "Built HTML layout convergence tests read .next/ production artifacts and can fail when artifacts are stale or removed mid-suite.",
      exampleCheckIds: [
        "grouped-query-attention-built-route-convergence",
        "phase-1-site-routes-unified-shell",
        "glossary-presentation-route-convergence",
      ],
      verificationCommands: ["make build", "make test"],
    },
  ] as const;

export const PHASE_2_3_RECONCILIATION_RECOMMENDED_FOLLOW_UP = {
  workItemKind: "phase-1-built-app-convergence-repair",
  summary:
    "Refresh Phase 1 built-app customer-ask convergence after reconciliation lands; do not patch static-export repair files from reconciliation work.",
  referenceDocs: [
    "factory/docs/phase-1-built-app-convergence-validator.md",
    "factory/docs/phase-1-follow-up-customer-ask-convergence-validator.md",
    PHASE_2_3_RECONCILIATION_IMPLEMENTATION_NOTES_PATH,
  ],
} as const;
