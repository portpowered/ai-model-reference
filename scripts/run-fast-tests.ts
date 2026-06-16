import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const excludedPrefixes = ["src/tests/build/"];

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

function isExcluded(relativePath: string): boolean {
  return excludedPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

const testFiles = listTestFiles(repoRoot)
  .map((filePath) => normalizePath(relative(repoRoot, filePath)))
  .filter((relativePath) => !isExcluded(relativePath))
  .sort();

if (testFiles.length === 0) {
  console.error("No fast test files found.");
  process.exit(1);
}

const result = spawnSync("bun", ["test", ...testFiles], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
