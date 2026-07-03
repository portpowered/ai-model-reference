import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pageFrontmatterSchema } from "@/lib/content/schemas";
import { parseYamlFrontmatterBlock } from "@/lib/content/yaml-frontmatter";
import {
  ConflictHotspotCollectionError,
  type ConflictHotspotSnapshot,
  type ConflictHotspotSurface,
  type ConflictHotspotSurfaceCategory,
  classifyConflictHotspotSurfaceCategory,
  collectConflictHotspotSnapshot,
  formatConflictHotspotSurfaceCategory,
} from "@/lib/factory/conflict-hotspot-report";

const DOCS_PAGE_PREFIX = "src/content/docs/";
const PAGE_MDX_NAME = "page.mdx";

const registryDirectoryByKind: Record<string, string> = {
  citation: "citations",
  concept: "concepts",
  graph: "graphs",
  module: "modules",
  model: "models",
  paper: "papers",
  "training-regime": "training-regimes",
  system: "systems",
  table: "tables",
};

export type CanonicalPageSurfaceClassification =
  | {
      kind: "declared-generated-output";
      path: string;
      reason: string;
    }
  | {
      kind: "page-owned";
      path: string;
      reason:
        | "matching primary structured record"
        | "matching page bundle"
        | "page-specific declared support record";
    }
  | {
      category: ConflictHotspotSurfaceCategory;
      categoryLabel: string;
      kind: "shared-hotspot-surface";
      path: string;
      reason: string;
    };

export type CanonicalPageSurfaceSharedCategorySummary = {
  category: ConflictHotspotSurfaceCategory;
  categoryLabel: string;
  evidenceSurfaces: readonly string[];
  paths: readonly string[];
};

export type CanonicalPageSurfaceRecommendedAction =
  | "declare-exception"
  | "keep-routine"
  | "redirect-to-throughput-prd"
  | "split-to-page-owned-work";

export type CanonicalPageSurfaceException = {
  reason: string;
};

export type CanonicalPageSurfaceGuidance = {
  details: readonly string[];
  headline: string;
  recommendedAction: CanonicalPageSurfaceRecommendedAction;
};

export type CanonicalPageSurfaceHotspotEvidence =
  | {
      fallbackReason: string;
      kind: "static-path-fallback";
      snapshot: null;
    }
  | {
      kind: "maintained-snapshot";
      snapshot: ConflictHotspotSnapshot;
    };

export type CanonicalPageSurfaceAuditResult = {
  budgetStatus: "over-budget" | "within-budget";
  changedPathSource: string;
  classifications: readonly CanonicalPageSurfaceClassification[];
  exception: CanonicalPageSurfaceException | null;
  generatedOutputs: readonly string[];
  guidance: CanonicalPageSurfaceGuidance;
  hotspotEvidence: CanonicalPageSurfaceHotspotEvidence;
  pageOwnedPaths: readonly string[];
  pageScope: {
    docsSlug: string;
    pageDirectory: string;
    registryId: string;
    registryPath: string;
    supportRecordPaths: readonly string[];
  };
  sharedHotspotCategories: readonly CanonicalPageSurfaceSharedCategorySummary[];
};

export class CanonicalPageSurfaceAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalPageSurfaceAuditError";
  }
}

type CollectCanonicalPageSurfaceAuditOptions = {
  baseRef?: string;
  changedPaths?: readonly string[];
  exception?: CanonicalPageSurfaceException;
  pageDirectory?: string;
  snapshot?: ConflictHotspotSnapshot;
};

type CanonicalPageScope = {
  docsSlug: string;
  pageDirectory: string;
  registryId: string;
  registryPath: string;
  slug: string;
  supportRecordPaths: readonly string[];
};

function normalizeRelativePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");
}

function normalizeMaybeRepoRelativePath(
  repoRoot: string,
  value: string,
): string {
  const normalized = normalizeRelativePath(value);
  const absolute = resolve(repoRoot, normalized);
  return normalizeRelativePath(relative(repoRoot, absolute));
}

function parsePageFrontmatter(pageMdxPath: string) {
  const source = readFileSync(pageMdxPath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    throw new CanonicalPageSurfaceAuditError(
      `Missing frontmatter in ${pageMdxPath}.`,
    );
  }

  return pageFrontmatterSchema.parse(parseYamlFrontmatterBlock(match[1]));
}

function collectDeclaredAssetRegistryIds(value: unknown): {
  graphIds: string[];
  tableIds: string[];
} {
  const graphIds = new Set<string>();
  const tableIds = new Set<string>();

  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (key === "graphId" && typeof child === "string") {
        graphIds.add(child);
      } else if (key === "tableId" && typeof child === "string") {
        tableIds.add(child);
      }

      visit(child);
    }
  }

  visit(value);

  return {
    graphIds: [...graphIds].sort(),
    tableIds: [...tableIds].sort(),
  };
}

function deriveRegistryPathFromId(registryId: string): string {
  const dotIndex = registryId.indexOf(".");
  if (dotIndex <= 0 || dotIndex === registryId.length - 1) {
    throw new CanonicalPageSurfaceAuditError(
      `Unsupported registryId "${registryId}" in canonical page scope.`,
    );
  }

  const kind = registryId.slice(0, dotIndex);
  const slug = registryId.slice(dotIndex + 1);
  const directory = registryDirectoryByKind[kind];
  if (!directory) {
    throw new CanonicalPageSurfaceAuditError(
      `Registry kind "${kind}" from "${registryId}" is not supported by the canonical page surface audit.`,
    );
  }

  return `src/content/registry/${directory}/${slug}.json`;
}

function isPageSpecificSupportRecord(
  pageSlug: string,
  recordId: string,
): boolean {
  const dotIndex = recordId.indexOf(".");
  const recordSlug = dotIndex >= 0 ? recordId.slice(dotIndex + 1) : recordId;
  return (
    recordSlug === pageSlug ||
    recordSlug.startsWith(`${pageSlug}-`) ||
    recordSlug.includes(`-${pageSlug}-`) ||
    recordSlug.endsWith(`-${pageSlug}`)
  );
}

function collectPageSpecificLinkedRegistryPaths(
  pageSlug: string,
  recordIds: readonly string[],
): string[] {
  const supportRecordPaths: string[] = [];

  for (const recordId of recordIds) {
    if (!isPageSpecificSupportRecord(pageSlug, recordId)) {
      continue;
    }

    const kind = recordId.split(".")[0];
    if (
      kind !== "citation" &&
      kind !== "graph" &&
      kind !== "paper" &&
      kind !== "table"
    ) {
      continue;
    }

    supportRecordPaths.push(deriveRegistryPathFromId(recordId));
  }

  return supportRecordPaths;
}

function collectModuleLinkedSupportRecordPaths(
  repoRoot: string,
  registryPath: string,
  pageSlug: string,
): readonly string[] {
  const absoluteRegistryPath = resolve(repoRoot, registryPath);
  if (!existsSync(absoluteRegistryPath)) {
    return [];
  }

  const record = JSON.parse(readFileSync(absoluteRegistryPath, "utf8")) as {
    citationIds?: string[];
    introducedByPaperIds?: string[];
    sourceId?: string;
  };
  const linkedRecordIds = [
    ...(record.citationIds ?? []),
    ...(record.introducedByPaperIds ?? []),
    ...(record.sourceId ? [record.sourceId] : []),
  ];

  return collectPageSpecificLinkedRegistryPaths(pageSlug, linkedRecordIds);
}

function collectSupportRecordPaths(
  repoRoot: string,
  pageDirectory: string,
  pageSlug: string,
  registryPath: string,
): readonly string[] {
  const supportRecordPaths = new Set<string>(
    collectModuleLinkedSupportRecordPaths(repoRoot, registryPath, pageSlug),
  );
  const assetsPath = resolve(repoRoot, pageDirectory, "assets.json");
  if (!existsSync(assetsPath)) {
    return [...supportRecordPaths].sort();
  }

  const assetIds = collectDeclaredAssetRegistryIds(
    JSON.parse(readFileSync(assetsPath, "utf8")),
  );

  for (const path of collectPageSpecificLinkedRegistryPaths(pageSlug, [
    ...assetIds.graphIds,
    ...assetIds.tableIds,
  ])) {
    supportRecordPaths.add(path);
  }

  return [...supportRecordPaths].sort();
}

function inferPageDirectory(
  changedPaths: readonly string[],
  explicitPageDirectory?: string,
): string {
  if (explicitPageDirectory) {
    return normalizeRelativePath(explicitPageDirectory).replace(/\/+$/, "");
  }

  const pageDirectories = new Set<string>();
  for (const changedPath of changedPaths) {
    if (!changedPath.startsWith(DOCS_PAGE_PREFIX)) {
      continue;
    }

    const segments = changedPath.split("/");
    if (segments.length < 5) {
      continue;
    }

    pageDirectories.add(segments.slice(0, 5).join("/"));
  }

  const sortedDirectories = [...pageDirectories].sort();
  if (sortedDirectories.length === 0) {
    throw new CanonicalPageSurfaceAuditError(
      "Unable to infer a canonical page scope from the changed files. Pass --page-dir <src/content/docs/<group>/<slug>> or include the page bundle in the changed-file set.",
    );
  }
  if (sortedDirectories.length > 1) {
    throw new CanonicalPageSurfaceAuditError(
      `Unable to infer one canonical page scope because the changed files span multiple page bundles: ${sortedDirectories.join(", ")}.`,
    );
  }

  return sortedDirectories[0];
}

function loadCanonicalPageScope(
  repoRoot: string,
  changedPaths: readonly string[],
  explicitPageDirectory?: string,
): CanonicalPageScope {
  const pageDirectory = inferPageDirectory(changedPaths, explicitPageDirectory);
  const pageMdxPath = resolve(repoRoot, pageDirectory, PAGE_MDX_NAME);
  if (!existsSync(pageMdxPath)) {
    throw new CanonicalPageSurfaceAuditError(
      `Expected ${pageDirectory}/${PAGE_MDX_NAME} to exist so the audit can read frontmatter and determine the matching registry scope.`,
    );
  }

  const frontmatter = parsePageFrontmatter(pageMdxPath);
  const registryPath = deriveRegistryPathFromId(frontmatter.registryId);
  const docsSlug = pageDirectory.slice(DOCS_PAGE_PREFIX.length);
  const slug = docsSlug.split("/").at(-1);
  if (!slug) {
    throw new CanonicalPageSurfaceAuditError(
      `Unable to derive the page slug from ${pageDirectory}.`,
    );
  }

  return {
    docsSlug,
    pageDirectory,
    registryId: frontmatter.registryId,
    registryPath,
    slug,
    supportRecordPaths: collectSupportRecordPaths(
      repoRoot,
      pageDirectory,
      slug,
      registryPath,
    ),
  };
}

function runGit(repoRoot: string, args: readonly string[]): string {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    const details = (result.stderr ?? result.stdout ?? "").trim();
    throw new CanonicalPageSurfaceAuditError(
      `git ${args.join(" ")} failed.${details ? ` ${details}` : ""}`,
    );
  }

  return result.stdout ?? "";
}

function gitRefExists(repoRoot: string, ref: string): boolean {
  const result = spawnSync("git", ["rev-parse", "--verify", ref], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
  return result.status === 0;
}

function detectDefaultBaseRef(repoRoot: string): string {
  const remoteHead = spawnSync(
    "git",
    ["symbolic-ref", "refs/remotes/origin/HEAD"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    },
  );
  if (remoteHead.status === 0 && remoteHead.stdout.trim().length > 0) {
    return remoteHead.stdout.trim().replace("refs/remotes/", "");
  }

  for (const candidate of ["origin/main", "main", "origin/master", "master"]) {
    if (gitRefExists(repoRoot, candidate)) {
      return candidate;
    }
  }

  throw new CanonicalPageSurfaceAuditError(
    "Unable to determine a default comparison base for the current branch. Pass --base <ref> or --files <path...>.",
  );
}

function collectChangedPathsFromBranch(
  repoRoot: string,
  baseRef?: string,
): { paths: readonly string[]; source: string } {
  const resolvedBaseRef = baseRef ?? detectDefaultBaseRef(repoRoot);
  const mergeBase = runGit(repoRoot, [
    "merge-base",
    resolvedBaseRef,
    "HEAD",
  ]).trim();
  if (!mergeBase) {
    throw new CanonicalPageSurfaceAuditError(
      `git merge-base ${resolvedBaseRef} HEAD returned no merge-base.`,
    );
  }

  const diffOutput = runGit(repoRoot, [
    "diff",
    "--name-only",
    `${mergeBase}..HEAD`,
  ]);
  const paths = diffOutput
    .split("\n")
    .map((line) => normalizeRelativePath(line))
    .filter(Boolean);

  if (paths.length === 0) {
    throw new CanonicalPageSurfaceAuditError(
      `No committed branch changes were found between ${resolvedBaseRef} and HEAD.`,
    );
  }

  return {
    paths,
    source: `current branch vs ${resolvedBaseRef} (merge-base ${mergeBase.slice(0, 12)})`,
  };
}

function collectChangedPaths(
  repoRoot: string,
  options: CollectCanonicalPageSurfaceAuditOptions,
): { paths: readonly string[]; source: string } {
  if (options.changedPaths && options.changedPaths.length > 0) {
    const paths = [
      ...new Set(
        options.changedPaths
          .map((path) => normalizeMaybeRepoRelativePath(repoRoot, path))
          .filter(Boolean),
      ),
    ].sort();
    if (paths.length === 0) {
      throw new CanonicalPageSurfaceAuditError(
        "The explicit changed-file set was empty after normalization.",
      );
    }
    return { paths, source: "explicit changed-file set" };
  }

  return collectChangedPathsFromBranch(repoRoot, options.baseRef);
}

const sharedHotspotReviewerBuckets: ReadonlyArray<{
  categories: readonly ConflictHotspotSurfaceCategory[];
  label: string;
}> = [
  {
    categories: ["shared-helper", "shared-registry", "authored-content"],
    label: "Content runtime and helper surfaces",
  },
  {
    categories: ["shared-test"],
    label: "Shared test and verification surfaces",
  },
];

function summarizeSharedHotspotCategories(
  classifications: readonly CanonicalPageSurfaceClassification[],
  snapshot: ConflictHotspotSnapshot | null,
): readonly CanonicalPageSurfaceSharedCategorySummary[] {
  const grouped = new Map<
    ConflictHotspotSurfaceCategory,
    CanonicalPageSurfaceSharedCategorySummary
  >();

  for (const classification of classifications) {
    if (classification.kind !== "shared-hotspot-surface") {
      continue;
    }

    const existing = grouped.get(classification.category);
    if (existing) {
      grouped.set(classification.category, {
        ...existing,
        paths: [...existing.paths, classification.path].sort(),
      });
      continue;
    }

    const evidenceSurfaces =
      snapshot === null
        ? []
        : snapshot.rankedSurfaces
            .filter((surface) => surface.category === classification.category)
            .slice(0, 3)
            .map(
              (surface: ConflictHotspotSurface) =>
                `${surface.surface} (${surface.touches} touches)`,
            );

    grouped.set(classification.category, {
      category: classification.category,
      categoryLabel: classification.categoryLabel,
      evidenceSurfaces,
      paths: [classification.path],
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.categoryLabel.localeCompare(right.categoryLabel),
  );
}

function classifyChangedPath(
  path: string,
  scope: CanonicalPageScope,
): CanonicalPageSurfaceClassification {
  if (path === scope.registryPath) {
    return {
      kind: "page-owned",
      path,
      reason: "matching primary structured record",
    };
  }

  if (
    path === scope.pageDirectory ||
    path.startsWith(`${scope.pageDirectory}/`)
  ) {
    return {
      kind: "page-owned",
      path,
      reason: "matching page bundle",
    };
  }

  if (scope.supportRecordPaths.includes(path)) {
    return {
      kind: "page-owned",
      path,
      reason: "page-specific declared support record",
    };
  }

  const category = classifyConflictHotspotSurfaceCategory(path);
  if (category === "generated-artifact") {
    return {
      kind: "declared-generated-output",
      path,
      reason: formatConflictHotspotSurfaceCategory(category),
    };
  }

  return {
    category,
    categoryLabel: formatConflictHotspotSurfaceCategory(category),
    kind: "shared-hotspot-surface",
    path,
    reason: formatConflictHotspotSurfaceCategory(category),
  };
}

const DUAL_ROUTE_FORBIDDEN_SHARED_PATH_PREFIXES = [
  "docs/internal/",
  "src/tests/search/",
] as const;

const DUAL_ROUTE_CONVERGENCE_DIFF_FORBIDDEN_PATTERNS = [
  /GLOSSARY_SHELL_RENDER_GROUP_TIMEOUT/,
  /REGISTRY_VALIDATION_GATE_TIMEOUT/,
  /ATTENTION_TAG_GROUPING_GATE_TIMEOUT/,
  /COMBINED_CONVERGENCE_GATE_TIMEOUT/,
  /renderSearchPagePanelContent/,
  /userEvent\.type/,
] as const;

function glossaryBridgePageExists(repoRoot: string, slug: string): boolean {
  return existsSync(
    resolve(repoRoot, `src/content/docs/glossary/${slug}/page.mdx`),
  );
}

function isAllowedDualRouteDiscoveryTest(path: string, slug: string): boolean {
  return (
    path === `src/lib/content/${slug}-concept-discovery.test.ts` ||
    path === `src/lib/content/${slug}-concept.test.ts` ||
    path === `src/lib/content/${slug}-slice-verification.test.tsx`
  );
}

function isDualRouteConvergenceFixtureDiff(
  diff: string,
  slug: string,
): boolean {
  if (!diff.trim()) {
    return false;
  }

  if (
    DUAL_ROUTE_CONVERGENCE_DIFF_FORBIDDEN_PATTERNS.some((pattern) =>
      pattern.test(diff),
    )
  ) {
    return false;
  }

  const glossaryUrl = `/docs/glossary/${slug}`;
  const conceptUrl = `/docs/concepts/${slug}`;
  const changedLines = diff
    .split("\n")
    .filter((line) => line.startsWith("+") || line.startsWith("-"))
    .filter((line) => !line.startsWith("+++") && !line.startsWith("---"));

  if (changedLines.length === 0) {
    return false;
  }

  return changedLines.every((line) => {
    const body = line.slice(1);
    return (
      body.includes(glossaryUrl) ||
      body.includes(conceptUrl) ||
      body.includes(slug) ||
      /searchUrl/i.test(body)
    );
  });
}

function evaluateGlossaryBridgeDualRouteBudget(
  scope: CanonicalPageScope,
  sharedPaths: readonly string[],
  repoRoot: string,
  changedPathSource: string,
  baseRef?: string,
): { reason: string } | null {
  if (!scope.registryId.startsWith("concept.")) {
    return null;
  }
  if (!scope.pageDirectory.startsWith("src/content/docs/concepts/")) {
    return null;
  }
  if (!glossaryBridgePageExists(repoRoot, scope.slug)) {
    return null;
  }

  const forbiddenPaths = sharedPaths.filter((path) =>
    DUAL_ROUTE_FORBIDDEN_SHARED_PATH_PREFIXES.some((prefix) =>
      path.startsWith(prefix),
    ),
  );
  if (forbiddenPaths.length > 0) {
    return null;
  }

  const discoveryTests = sharedPaths.filter((path) =>
    isAllowedDualRouteDiscoveryTest(path, scope.slug),
  );
  if (discoveryTests.length > 1) {
    return null;
  }

  const convergencePaths = sharedPaths.filter(
    (path) =>
      !isAllowedDualRouteDiscoveryTest(path, scope.slug) &&
      path !== "src/lib/factory/canonical-page-surface-audit.ts" &&
      path !== "src/lib/factory/canonical-page-surface-audit.test.ts",
  );

  for (const path of convergencePaths) {
    if (
      !path.startsWith("src/lib/content/") &&
      !path.startsWith("src/lib/docs/")
    ) {
      return null;
    }

    if (changedPathSource !== "explicit changed-file set") {
      const resolvedBaseRef = baseRef ?? detectDefaultBaseRef(repoRoot);
      const mergeBase = runGit(repoRoot, [
        "merge-base",
        resolvedBaseRef,
        "HEAD",
      ]).trim();
      const diff = runGit(repoRoot, ["diff", `${mergeBase}..HEAD`, "--", path]);
      if (!isDualRouteConvergenceFixtureDiff(diff, scope.slug)) {
        return null;
      }
    }
  }

  return {
    reason: `Glossary-bridge dual-route for ${scope.registryId}: one discovery test plus convergence fixture href/search updates while /docs/glossary/${scope.slug} remains published.`,
  };
}

function collectGuidance(
  classifications: readonly CanonicalPageSurfaceClassification[],
  exception: CanonicalPageSurfaceException | null,
  sharedHotspotCategories: readonly CanonicalPageSurfaceSharedCategorySummary[],
  scope: CanonicalPageScope,
  repoRoot: string,
  changedPathSource: string,
  baseRef?: string,
): CanonicalPageSurfaceGuidance {
  const generatedOutputs = classifications
    .filter((item) => item.kind === "declared-generated-output")
    .map((item) => item.path);
  const sharedPaths = classifications
    .filter((item) => item.kind === "shared-hotspot-surface")
    .map((item) => item.path);
  const sharedCategoryLabels = sharedHotspotCategories.map(
    (item) => item.categoryLabel,
  );
  const hasSharedTestCategory = sharedHotspotCategories.some(
    (item) => item.category === "shared-test",
  );
  const hasAuthoredContentCategory = sharedHotspotCategories.some(
    (item) => item.category === "authored-content",
  );
  const hasMultipleSharedCategories = sharedHotspotCategories.length > 1;
  const hasMultipleSharedPaths = sharedPaths.length > 1;
  const canStayInExceptionLane =
    !hasSharedTestCategory &&
    !hasAuthoredContentCategory &&
    !hasMultipleSharedCategories &&
    !hasMultipleSharedPaths &&
    generatedOutputs.length === 0;

  if (generatedOutputs.length === 0 && sharedHotspotCategories.length === 0) {
    return {
      details: [
        "This branch stays inside the default owned page surface for one canonical page.",
      ],
      headline: "Routine page-owned work; no extra justification is needed.",
      recommendedAction: "keep-routine",
    };
  }

  if (generatedOutputs.length > 0 && sharedHotspotCategories.length === 0) {
    return {
      details: [
        `Generated outputs are present in the branch diff: ${generatedOutputs.join(", ")}.`,
        "Regenerate supported outputs locally, then drop generated runtime artifacts from the routine commit unless this branch is explicitly broader than one page.",
      ],
      headline:
        "Split this branch back to page-owned work by removing generated output churn from the review commit.",
      recommendedAction: "split-to-page-owned-work",
    };
  }

  if (canStayInExceptionLane) {
    const details = [
      `One shared hotspot category is touched: ${sharedCategoryLabels.join(", ")}.`,
      `Shared path: ${sharedPaths.join(", ")}.`,
    ];
    if (exception) {
      details.push(
        `Visible exception declared: "${exception.reason}". Repeat that justification in the PR conversation comment so reviewers can evaluate the broader touch explicitly.`,
      );
    } else {
      details.push(
        'If this shared touch is truly required to ship the page, rerun the guard with --exception-reason "..." and copy the same justification into the PR conversation comment.',
      );
    }

    return {
      details,
      headline:
        "This branch is over the routine budget, but it can stay in one narrow PR if you make the exception explicit and reviewable.",
      recommendedAction: "declare-exception",
    };
  }

  const dualRouteException = evaluateGlossaryBridgeDualRouteBudget(
    scope,
    sharedPaths,
    repoRoot,
    changedPathSource,
    baseRef,
  );
  if (dualRouteException) {
    const details = [
      "This branch matches the documented glossary-bridge plus concept-canonical dual-route exception.",
      dualRouteException.reason,
      `Shared paths: ${sharedPaths.join(", ")}.`,
    ];
    if (exception) {
      details.push(
        `Visible exception declared: "${exception.reason}". Repeat that justification in the PR conversation comment so reviewers can evaluate the broader touch explicitly.`,
      );
    } else {
      details.push(
        "Repeat the dual-route justification in the PR conversation comment so reviewers can confirm the shared touches stay limited to discovery and convergence fixtures.",
      );
    }

    return {
      details,
      headline:
        "This branch is over the routine budget, but it fits the glossary-bridge dual-route exception when discovery and convergence fixture updates stay narrowly scoped.",
      recommendedAction: "declare-exception",
    };
  }

  const details = [
    sharedCategoryLabels.length > 0
      ? `Shared hotspot categories in this branch: ${sharedCategoryLabels.join(", ")}.`
      : "This branch exceeds the routine page-owned budget.",
  ];
  if (sharedPaths.length > 0) {
    details.push(`Representative shared paths: ${sharedPaths.join(", ")}.`);
  }
  if (generatedOutputs.length > 0) {
    details.push(
      `Generated outputs are also present: ${generatedOutputs.join(", ")}.`,
    );
  }
  details.push(
    "Split the broader work into a dedicated throughput PRD lane, or separate the shared-surface changes from the routine canonical-page branch.",
  );
  if (exception) {
    details.push(
      `A visible exception was declared ("${exception.reason}"), but the branch still exceeds the narrow one-page exception lane.`,
    );
  }

  return {
    details,
    headline:
      "This branch crosses known shared conflict surfaces and should be redirected out of the routine canonical-page lane.",
    recommendedAction: "redirect-to-throughput-prd",
  };
}

export function collectCanonicalPageSurfaceAudit(
  repoRoot: string,
  options: CollectCanonicalPageSurfaceAuditOptions = {},
): CanonicalPageSurfaceAuditResult {
  const resolvedRepoRoot = resolve(repoRoot);
  const changedPathSet = collectChangedPaths(resolvedRepoRoot, options);
  const scope = loadCanonicalPageScope(
    resolvedRepoRoot,
    changedPathSet.paths,
    options.pageDirectory,
  );

  let hotspotEvidence: CanonicalPageSurfaceHotspotEvidence;
  if (options.snapshot) {
    hotspotEvidence = {
      kind: "maintained-snapshot",
      snapshot: options.snapshot,
    };
  } else {
    try {
      hotspotEvidence = {
        kind: "maintained-snapshot",
        snapshot: collectConflictHotspotSnapshot(resolvedRepoRoot),
      };
    } catch (error) {
      if (error instanceof ConflictHotspotCollectionError) {
        hotspotEvidence = {
          fallbackReason: error.message,
          kind: "static-path-fallback",
          snapshot: null,
        };
      } else {
        throw error;
      }
    }
  }
  const resolvedSnapshot = hotspotEvidence.snapshot;

  const classifications = changedPathSet.paths.map((path) =>
    classifyChangedPath(path, scope),
  );
  const sharedHotspotCategories = summarizeSharedHotspotCategories(
    classifications,
    resolvedSnapshot,
  );
  const generatedOutputs = classifications
    .filter((item) => item.kind === "declared-generated-output")
    .map((item) => item.path);
  const budgetStatus =
    sharedHotspotCategories.length > 0 || generatedOutputs.length > 0
      ? "over-budget"
      : "within-budget";
  const exception = options.exception ?? null;

  return {
    budgetStatus,
    changedPathSource: changedPathSet.source,
    classifications,
    exception,
    generatedOutputs,
    guidance: collectGuidance(
      classifications,
      exception,
      sharedHotspotCategories,
      scope,
      resolvedRepoRoot,
      changedPathSet.source,
      options.baseRef,
    ),
    pageOwnedPaths: classifications
      .filter((item) => item.kind === "page-owned")
      .map((item) => item.path),
    pageScope: {
      docsSlug: scope.docsSlug,
      pageDirectory: scope.pageDirectory,
      registryId: scope.registryId,
      registryPath: scope.registryPath,
      supportRecordPaths: scope.supportRecordPaths,
    },
    sharedHotspotCategories,
    hotspotEvidence,
  };
}

function formatSharedHotspotSummaryByBucket(
  sharedHotspotCategories: readonly CanonicalPageSurfaceSharedCategorySummary[],
): string[] {
  if (sharedHotspotCategories.length === 0) {
    return ["- None."];
  }

  const lines: string[] = [];
  for (const bucket of sharedHotspotReviewerBuckets) {
    const bucketSummaries = sharedHotspotCategories.filter((summary) =>
      bucket.categories.includes(summary.category),
    );
    lines.push("", bucket.label);
    if (bucketSummaries.length === 0) {
      lines.push("- None in this branch.");
      continue;
    }

    for (const summary of bucketSummaries) {
      lines.push(
        `- ${summary.categoryLabel}: ${summary.paths.length} changed path(s); examples: ${summary.paths.slice(0, 3).join(", ")}`,
      );
      if (summary.evidenceSurfaces.length > 0) {
        lines.push(`  Evidence: ${summary.evidenceSurfaces.join(", ")}`);
      }
    }
  }

  return lines;
}

export function formatCanonicalPageSurfaceAudit(
  result: CanonicalPageSurfaceAuditResult,
): string {
  const lines = [
    "Canonical page PR-surface audit",
    `Page scope: ${result.pageScope.pageDirectory} (${result.pageScope.registryId})`,
    `Changed paths: ${result.changedPathSource}`,
    `Budget status: ${result.budgetStatus}`,
    "",
    "Scope summary",
    `- Page-owned paths: ${result.pageOwnedPaths.length}`,
    `- Declared generated outputs: ${result.generatedOutputs.length}`,
    `- Shared hotspot categories: ${result.sharedHotspotCategories.length}`,
  ];

  if (result.pageScope.supportRecordPaths.length > 0) {
    lines.push(
      `- Page-specific support records: ${result.pageScope.supportRecordPaths.join(", ")}`,
    );
  }

  lines.push(`- Recommended action: ${result.guidance.recommendedAction}`);
  if (result.exception) {
    lines.push(`- Visible exception: ${result.exception.reason}`);
  }

  lines.push("", "Changed path classifications");
  for (const classification of result.classifications) {
    switch (classification.kind) {
      case "page-owned":
        lines.push(
          `- ${classification.path} -> page-owned (${classification.reason})`,
        );
        break;
      case "declared-generated-output":
        lines.push(
          `- ${classification.path} -> declared generated output (${classification.reason})`,
        );
        break;
      case "shared-hotspot-surface":
        lines.push(
          `- ${classification.path} -> shared hotspot surface [${classification.categoryLabel}]`,
        );
        break;
    }
  }

  lines.push("", "Hotspot evidence source");
  if (result.hotspotEvidence.kind === "maintained-snapshot") {
    lines.push(
      `- Maintained snapshot: last ${result.hotspotEvidence.snapshot.recentCommitLimit} commits generated at ${result.hotspotEvidence.snapshot.generatedAtUtc}`,
    );
    lines.push(
      "- Classification uses the same hotspot contract as `bun run report:planner-conflict-hotspots`.",
    );
  } else {
    lines.push(
      "- Fallback mode: static path classification only (maintained hotspot snapshot unavailable).",
    );
    lines.push(`- Fallback reason: ${result.hotspotEvidence.fallbackReason}`);
    lines.push(
      "- Re-run `bun run report:planner-conflict-hotspots` from a git checkout when ranked hotspot evidence is required.",
    );
  }

  lines.push("", "Shared hotspot summary");
  lines.push(
    ...formatSharedHotspotSummaryByBucket(result.sharedHotspotCategories),
  );

  lines.push("", "Guidance");
  lines.push(`- ${result.guidance.headline}`);
  for (const detail of result.guidance.details) {
    lines.push(`- ${detail}`);
  }

  return lines.join("\n");
}
