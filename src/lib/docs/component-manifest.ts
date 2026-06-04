/**
 * Reusable shared components subject to the manifest-driven coverage gate.
 * Allowed manifest paths: src/components (any depth), src/features/.../components,
 * and documented search UI under src/features/docs/search/.
 *
 * Update this manifest and docs/phase-2-component-coverage.md when adding components.
 */
export type ComponentCoverageEntry = {
  /** Repo-relative source path */
  file: string;
  /** Human label for docs and failure messages */
  label: string;
  /** Minimum reachable line coverage (Bun `bun test --coverage` line %) */
  minReachableLinePercent: number;
  /** Unit or integration tests that exercise the component */
  unitTests: string[];
  /** Accessibility smoke tests, when applicable */
  a11ySmokeTests?: string[];
};

export type ThinWrapperEntry = {
  file: string;
  label: string;
  /** Primitive or package the wrapper forwards to */
  forwardsTo: string;
  /** Named smoke tests that prove render + accessibility */
  smokeTests: string[];
};

export const REUSABLE_COVERAGE_COMPONENTS: ComponentCoverageEntry[] = [
  {
    file: "src/features/docs/components/Callout.tsx",
    label: "Callout",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/Callout.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/docs-components.a11y.test.tsx (Callout accessibility smoke)",
    ],
  },
  {
    file: "src/features/docs/components/Section.tsx",
    label: "Section",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/Section.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/docs-components.a11y.test.tsx (Section accessibility smoke)",
    ],
  },
  {
    file: "src/features/docs/components/T.tsx",
    label: "T",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/T.test.tsx"],
    a11ySmokeTests: [
      "src/tests/component-examples/registry.test.tsx (T example render smoke)",
    ],
  },
  {
    file: "src/features/docs/components/TagPillList.tsx",
    label: "TagPillList",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/TagPillList.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/docs-components.a11y.test.tsx (TagPillList accessibility smoke)",
    ],
  },
  {
    file: "src/features/docs/components/DerivedRelatedDocs.tsx",
    label: "DerivedRelatedDocs",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/DerivedRelatedDocs.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/docs-components.a11y.test.tsx (DerivedRelatedDocs accessibility smoke)",
    ],
  },
  {
    file: "src/features/docs/search/SearchResults.tsx",
    label: "SearchResults (inline + dialog rows)",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/search/SearchResults.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/docs-components.a11y.test.tsx (SearchResults accessibility smoke)",
    ],
  },
  {
    file: "src/features/docs/search/SearchResultMetaDetails.tsx",
    label: "SearchResultMetaDetails",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/search/SearchResults.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/docs-components.a11y.test.tsx (SearchResultMetaDetails accessibility smoke)",
    ],
  },
];

/** Documented thin wrappers — none among current reusable docs components. */
export const REUSABLE_THIN_WRAPPERS: ThinWrapperEntry[] = [];
