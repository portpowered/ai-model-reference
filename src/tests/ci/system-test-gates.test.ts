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
});
