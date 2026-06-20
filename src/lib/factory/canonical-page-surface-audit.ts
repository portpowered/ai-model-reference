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

export type CanonicalPageSurfaceAuditResult = {
  budgetStatus: "over-budget" | "within-budget";
  changedPathSource: string;
  classifications: readonly CanonicalPageSurfaceClassification[];
  generatedOutputs: readonly string[];
  pageOwnedPaths: readonly string[];
  pageScope: {
    docsSlug: string;
    pageDirectory: string;
    registryId: string;
    registryPath: string;
    supportRecordPaths: readonly string[];
  };
  sharedHotspotCategories: readonly CanonicalPageSurfaceSharedCategorySummary[];
  snapshot: ConflictHotspotSnapshot;
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

function collectSupportRecordPaths(
  repoRoot: string,
  pageDirectory: string,
  pageSlug: string,
): readonly string[] {
  const assetsPath = resolve(repoRoot, pageDirectory, "assets.json");
  if (!existsSync(assetsPath)) {
    return [];
  }

  const assetIds = collectDeclaredAssetRegistryIds(
    JSON.parse(readFileSync(assetsPath, "utf8")),
  );
  const supportRecordPaths = new Set<string>();

  for (const graphId of assetIds.graphIds) {
    if (isPageSpecificSupportRecord(pageSlug, graphId)) {
      supportRecordPaths.add(deriveRegistryPathFromId(graphId));
    }
  }
  for (const tableId of assetIds.tableIds) {
    if (isPageSpecificSupportRecord(pageSlug, tableId)) {
      supportRecordPaths.add(deriveRegistryPathFromId(tableId));
    }
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

function summarizeSharedHotspotCategories(
  classifications: readonly CanonicalPageSurfaceClassification[],
  snapshot: ConflictHotspotSnapshot,
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

    const evidenceSurfaces = snapshot.rankedSurfaces
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

  const snapshot = options.snapshot;
  if (!snapshot) {
    try {
      options.snapshot = collectConflictHotspotSnapshot(resolvedRepoRoot);
    } catch (error) {
      if (error instanceof ConflictHotspotCollectionError) {
        throw new CanonicalPageSurfaceAuditError(
          `Unable to collect hotspot evidence for the PR-surface audit. ${error.message}`,
        );
      }
      throw error;
    }
  }
  const resolvedSnapshot = options.snapshot;
  if (!resolvedSnapshot) {
    throw new CanonicalPageSurfaceAuditError(
      "Hotspot evidence was not available for the canonical page surface audit.",
    );
  }

  const classifications = changedPathSet.paths.map((path) =>
    classifyChangedPath(path, scope),
  );
  const sharedHotspotCategories = summarizeSharedHotspotCategories(
    classifications,
    resolvedSnapshot,
  );

  return {
    budgetStatus:
      sharedHotspotCategories.length > 0 ? "over-budget" : "within-budget",
    changedPathSource: changedPathSet.source,
    classifications,
    generatedOutputs: classifications
      .filter((item) => item.kind === "declared-generated-output")
      .map((item) => item.path),
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
    snapshot: resolvedSnapshot,
  };
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
  lines.push(
    `- Current snapshot: last ${result.snapshot.recentCommitLimit} commits generated at ${result.snapshot.generatedAtUtc}`,
  );

  if (result.sharedHotspotCategories.length === 0) {
    lines.push("", "Shared hotspot summary", "- None.");
  } else {
    lines.push("", "Shared hotspot summary");
    for (const summary of result.sharedHotspotCategories) {
      lines.push(
        `- ${summary.categoryLabel}: ${summary.paths.length} changed path(s); examples: ${summary.paths.slice(0, 3).join(", ")}`,
      );
      if (summary.evidenceSurfaces.length > 0) {
        lines.push(`  Evidence: ${summary.evidenceSurfaces.join(", ")}`);
      }
    }
  }

  return lines.join("\n");
}
