import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CONTENT_RUNTIME_PREPARATION_STEPS } from "@/lib/content/content-runtime-preparation";

export const repoRoot = join(import.meta.dir, "../../..");
export const STALE_CONTENT_RUNTIME_SENTINEL =
  "__STALE_CONTENT_RUNTIME_SENTINEL__";

export const missingSourceServerPattern =
  /cannot find module.*\.source\/server|cannot find module.*\.\.\/\.\.\/\.source\/server/i;

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

export function isGitWorktreeDirty(repoPath: string): boolean {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoPath,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    return true;
  }
  return (result.stdout ?? "").trim().length > 0;
}

export function poisonGeneratedRuntimeArtifacts(
  worktreePath: string,
): string[] {
  const artifactPaths = CONTENT_RUNTIME_PREPARATION_STEPS.map((step) =>
    join(worktreePath, step.outputPath),
  );

  for (const [index, artifactPath] of artifactPaths.entries()) {
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(
      artifactPath,
      `export const staleRuntimeArtifact${index} = "${STALE_CONTENT_RUNTIME_SENTINEL}:${index}";\n`,
      "utf8",
    );
  }

  return artifactPaths;
}

export function expectGeneratedRuntimeArtifactsRefreshed(
  artifactPaths: readonly string[],
): void {
  for (const artifactPath of artifactPaths) {
    if (!existsSync(artifactPath)) {
      throw new Error(`Expected generated runtime artifact at ${artifactPath}`);
    }
    if (
      readFileSync(artifactPath, "utf8").includes(
        STALE_CONTENT_RUNTIME_SENTINEL,
      )
    ) {
      throw new Error(
        `Expected ${artifactPath} to be refreshed before the command completed.`,
      );
    }
  }
}
