import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

export const missingSourceServerPattern =
  /cannot find module.*\.source\/server|cannot find module.*\.\.\/\.\.\/\.source\/server/i;

export const generatedMaintainerArtifactRelativePaths = [
  "src/generated/shipped-localized-docs.ts",
  "src/lib/content/published-docs-registry-manifest.ts",
  "src/lib/content/registry-runtime.generated.ts",
  "src/lib/content/graph-registry-runtime.generated.ts",
] as const;

export function formatSubprocessOutput(
  result: SpawnSyncReturns<string>,
): string {
  const chunks: string[] = [];
  const stderr = result.stderr ?? "";
  const stdout = result.stdout ?? "";
  if (result.status === null) {
    chunks.push("subprocess did not finish (status is null)");
    if (result.signal) {
      chunks.push(`signal: ${result.signal}`);
    }
    if (result.error) {
      chunks.push(`spawn error: ${result.error.message}`);
    }
  } else {
    chunks.push(`exit status: ${result.status}`);
  }
  if (stderr.trim()) {
    chunks.push(`stderr:\n${stderr.trimEnd()}`);
  }
  if (stdout.trim()) {
    chunks.push(`stdout:\n${stdout.trimEnd()}`);
  }
  return chunks.join("\n");
}

export function isGitWorktreeDirty(repoRoot: string): boolean {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    return true;
  }
  return (result.stdout ?? "").trim().length > 0;
}

export function removeGeneratedMaintainerArtifacts(worktreePath: string): void {
  for (const relativePath of generatedMaintainerArtifactRelativePaths) {
    rmSync(join(worktreePath, relativePath), { force: true, recursive: true });
  }
}

export function generatedMaintainerArtifactsExist(
  worktreePath: string,
): boolean {
  return generatedMaintainerArtifactRelativePaths.every((relativePath) =>
    existsSync(join(worktreePath, relativePath)),
  );
}
