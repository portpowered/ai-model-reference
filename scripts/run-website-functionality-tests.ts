import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { resolveWebsiteTestShardWorkers } from "../src/lib/verify/website-test-sharding";

const repoRoot = join(import.meta.dir, "..");

const excludedPrefixes = [
  "src/lib/verify/",
  "src/lib/governance/",
  "src/tests/build/",
  "src/tests/ci/",
];

const excludedFiles = new Set([
  "src/lib/build/built-app-html-test-utils.test.ts",
  "src/lib/build/ensure-export-search-artifacts.test.ts",
  "src/lib/build/run-static-export-build.test.ts",
  "src/lib/build/turbopack-nft-tracing-warning.test.ts",
  "src/lib/build/validate-links.test.ts",
  "src/lib/build/verify-export-base-path.test.ts",
  "src/lib/build/verify-export-routes.test.ts",
  "src/lib/build/verify-module-built-routes.test.ts",
  "src/lib/docs/component-coverage-gate.test.ts",
]);

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
  return (
    excludedFiles.has(relativePath) ||
    excludedPrefixes.some((prefix) => relativePath.startsWith(prefix))
  );
}

function resolveShardWorkers(): number {
  return resolveWebsiteTestShardWorkers(
    process.env.WEBSITE_TEST_PARALLEL_WORKERS,
  );
}

function runBunTestShard(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "bun",
      ["test", "--preload", "./src/tests/a11y/mock-navigation.ts", ...args],
      {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env,
      },
    );

    child.once("error", reject);
    child.once("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

function distributeAcrossShards(
  files: string[],
  shardCount: number,
): string[][] {
  const shards = Array.from({ length: shardCount }, () => [] as string[]);

  files.forEach((file, index) => {
    shards[index % shardCount]?.push(file);
  });

  return shards.filter((shard) => shard.length > 0);
}

const testFiles = listTestFiles(repoRoot)
  .map((filePath) => normalizePath(relative(repoRoot, filePath)))
  .filter((relativePath) => !isExcluded(relativePath))
  .sort();

if (testFiles.length === 0) {
  console.error("No website functionality test files found.");
  process.exit(1);
}

const shards = distributeAcrossShards(testFiles, resolveShardWorkers());
const statuses = await Promise.all(
  shards.map((shard) => runBunTestShard(shard)),
);
const failingStatus = statuses.find((status) => status !== 0);
if (failingStatus !== undefined) {
  process.exit(failingStatus);
}

process.exit(0);
