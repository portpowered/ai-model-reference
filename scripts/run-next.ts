import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

function resolveNextBin(startDir: string): string {
  let currentDir = startDir;

  while (true) {
    const candidate = join(
      currentDir,
      "node_modules",
      "next",
      "dist",
      "bin",
      "next",
    );
    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(
        `Unable to resolve next CLI from ${startDir}. Expected node_modules/next/dist/bin/next in this workspace or a parent directory.`,
      );
    }

    currentDir = parentDir;
  }
}

const [, , ...args] = process.argv;

if (args.length === 0) {
  throw new Error("Usage: bun ./scripts/run-next.ts <next-args...>");
}

const nextBin = resolveNextBin(process.cwd());
const result = spawnSync("node", [nextBin, ...args], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}

process.exit(1);
