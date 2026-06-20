import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");

const allowedSystemTestPrefixes = [
  "src/tests/build/",
  "src/lib/build/run-static-export-build.test.ts",
];

const expensiveBuildPatterns = [
  /\brunStaticExportBuild\s*\(/,
  /spawnSync\(\s*["']bun["']\s*,\s*\[\s*["']run["']\s*,\s*["']build(?::export)?["']/,
  /spawnSync\(\s*["']bun["']\s*,\s*\[\s*["']\.\/scripts\/run-static-export-build/,
];

const historicalTestNamePattern =
  /(^|\/)(?:[^/]*phase-\d|[^/]*batch-\d)[^/]*\.test\.tsx?$/;

const grandfatheredHistoricalTestNames = [
  "src/lib/content/phase-1-published-resources.test.ts",
  "src/lib/content/phase-2-token-probability-path-inventory.test.ts",
  "src/lib/content/phase-2-token-probability-path-registry-alignment.test.ts",
  "src/lib/content/phase-2-token-probability-path-related-docs.test.tsx",
  "src/lib/content/phase-2-token-probability-path-route-rendering.test.tsx",
  "src/lib/content/phase-2-token-probability-path-search.test.tsx",
  "src/lib/content/phase-2-token-probability-path-validation.test.ts",
  "src/lib/content/phase-4-japanese-attention-variant-proof-set.test.tsx",
  "src/lib/content/phase-4-vietnamese-head-sharing-attention.test.tsx",
  "src/lib/content/phase-4-vietnamese-long-context-attention.test.tsx",
  "src/lib/content/phase-4-vietnamese-probability-chain-glossary.test.tsx",
  "src/lib/content/phase-5-sampling-basics-search-locale.test.ts",
  "src/lib/content/phase-5-serving-path-search-locale.test.ts",
  "src/lib/verify/phase-4-japanese-attention-route-checks.test.ts",
  "src/tests/content/phase-1-attention-tag-discovery-regression.test.ts",
  "src/tests/content/phase-1-attention-tag-landing-built-app.test.ts",
  "src/tests/content/phase-1-shell-discovery-built-app.test.ts",
  "src/tests/content/phase-4-japanese-attention-proof-set-built-app.test.ts",
] as const;

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function listTestFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === "out" ||
      entry.name === ".claude" ||
      entry.name === ".playwright-mcp" ||
      entry.name === ".source" ||
      entry.name === ".git"
    ) {
      continue;
    }

    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTestFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

function isAllowedSystemTestPath(relativePath: string): boolean {
  return allowedSystemTestPrefixes.some((prefix) =>
    relativePath.startsWith(prefix),
  );
}

describe("system test gate boundaries", () => {
  test("expensive build/export invocations stay in approved system test locations", () => {
    const violations = listTestFiles(repoRoot)
      .map((filePath) => ({
        filePath,
        relativePath: normalizePath(relative(repoRoot, filePath)),
        source: readFileSync(filePath, "utf8"),
      }))
      .filter(({ relativePath, source }) => {
        if (isAllowedSystemTestPath(relativePath)) {
          return false;
        }
        return expensiveBuildPatterns.some((pattern) => pattern.test(source));
      })
      .map(({ relativePath }) => relativePath);

    expect(violations).toEqual([]);
  });

  test("test filenames use behavior or domain names instead of phase and batch labels", () => {
    const violations = listTestFiles(repoRoot)
      .map((filePath) => normalizePath(relative(repoRoot, filePath)))
      .filter((relativePath) => historicalTestNamePattern.test(relativePath));

    expect([...violations].sort()).toEqual(
      [...grandfatheredHistoricalTestNames].sort(),
    );
  });
});
