/**
 * Reusable shared components subject to the manifest-driven coverage gate.
 * Allowed manifest paths: src/components (any depth), src/features/.../components,
 * documented search UI under src/features/docs/search/, and tag list UI under
 * src/features/docs/tags/.
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

/** Phase 1 home/header/tag shell components touched by surface-polish work. */
export const PHASE_1_SHELL_COVERAGE_COMPONENTS: ComponentCoverageEntry[] = [
  {
    file: "src/components/home/home-brush-header.tsx",
    label: "HomeBrushHeader",
    minReachableLinePercent: 90,
    unitTests: ["src/components/home/home-brush-header.test.tsx"],
  },
  {
    file: "src/components/home/home-article.tsx",
    label: "HomeArticle",
    minReachableLinePercent: 90,
    unitTests: ["src/tests/content/home-page.test.tsx"],
  },
  {
    file: "src/components/home/home-browse-link.tsx",
    label: "HomeBrowseLink",
    minReachableLinePercent: 90,
    unitTests: ["src/components/home/home-browse-link.test.tsx"],
  },
  {
    file: "src/components/layout/primary-nav.ts",
    label: "Primary navigation",
    minReachableLinePercent: 90,
    unitTests: ["src/components/layout/primary-nav.test.ts"],
    a11ySmokeTests: ["src/tests/a11y/primary-navigation.a11y.test.tsx"],
  },
  {
    file: "src/components/layout/canonical-docs-layout.tsx",
    label: "CanonicalDocsLayout",
    minReachableLinePercent: 90,
    unitTests: ["src/tests/a11y/docs-sidebar-navigation.a11y.test.tsx"],
    a11ySmokeTests: ["src/tests/a11y/docs-sidebar-navigation.a11y.test.tsx"],
  },
  {
    file: "src/features/docs/search/SearchTrigger.tsx",
    label: "SearchTrigger",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/search/SearchTrigger.test.tsx"],
    a11ySmokeTests: ["src/tests/a11y/primary-navigation.a11y.test.tsx"],
  },
  {
    file: "src/features/docs/components/TagResourceList.tsx",
    label: "TagResourceList",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/TagResourceList.test.tsx"],
  },
  {
    file: "src/features/docs/tags/TagsIndexList.tsx",
    label: "TagsIndexList",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/tags/TagsIndexList.test.tsx"],
  },
];

const PHASE_2_DOCS_MDX_COVERAGE_COMPONENTS: ComponentCoverageEntry[] = [
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
    file: "src/features/docs/components/GlossaryOpening.tsx",
    label: "GlossaryOpening",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/GlossaryOpening.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/glossary-token.a11y.test.tsx (token glossary route accessibility smoke)",
    ],
  },
  {
    file: "src/features/docs/components/RelatedDocList.tsx",
    label: "RelatedDocList",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/RelatedDocList.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/glossary-token.a11y.test.tsx (token glossary route accessibility smoke)",
    ],
  },
  {
    file: "src/features/docs/components/TagPillList.tsx",
    label: "TagPillList",
    minReachableLinePercent: 90,
    unitTests: ["src/features/docs/components/TagPillList.test.tsx"],
    a11ySmokeTests: [
      "src/tests/a11y/docs-components.a11y.test.tsx (TagPillList accessibility smoke)",
      "src/tests/a11y/glossary-token.a11y.test.tsx (token glossary route accessibility smoke)",
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
    file: "src/features/docs/search/SearchResultRow.tsx",
    label: "SearchResultRow",
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

export const REUSABLE_COVERAGE_COMPONENTS: ComponentCoverageEntry[] = [
  ...PHASE_2_DOCS_MDX_COVERAGE_COMPONENTS,
  ...PHASE_1_SHELL_COVERAGE_COMPONENTS,
];

/** Documented thin wrappers — none among current reusable docs components. */
export const REUSABLE_THIN_WRAPPERS: ThinWrapperEntry[] = [];
