import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { getGeneratedContentRuntimeRoot } from "@/lib/content/content-paths";
import {
  CONTENT_RUNTIME_PREPARATION_STEPS,
  type ContentRuntimePreparationCommandResult,
  runContentRuntimePreparation,
} from "@/lib/content/content-runtime-preparation";

const repoRoot = join(import.meta.dir, "../../..");
const GENERATED_REGISTRY_RUNTIME_RELATIVE_PATH =
  "src/lib/content/generated/registry-runtime.generated.ts";
const LEGACY_TOP_LEVEL_GENERATED_RUNTIME_PATHS = [
  "src/lib/content/published-docs-registry-manifest.ts",
] as const;

describe("content runtime preparation", () => {
  test("runs required runtime generation steps in canonical order", () => {
    const commands: string[] = [];
    const result = runContentRuntimePreparation({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      runCommand(command) {
        commands.push(command.join(" "));
        return {
          signal: null,
          status: 0,
        } satisfies ContentRuntimePreparationCommandResult;
      },
    });

    expect(result).toEqual({
      ok: true,
      completedSteps: [...CONTENT_RUNTIME_PREPARATION_STEPS],
    });
    expect(commands).toEqual(
      CONTENT_RUNTIME_PREPARATION_STEPS.map((step) => step.command.join(" ")),
    );
  });

  test("stops at the first failing step and reports the step id", () => {
    const errors: string[] = [];
    const result = runContentRuntimePreparation({
      cwd: repoRoot,
      log: () => {},
      logError(message) {
        errors.push(message);
      },
      runCommand(command) {
        const step = command[2];
        return {
          signal: null,
          status: step === "generate:graph-registry-runtime" ? 23 : 0,
        } satisfies ContentRuntimePreparationCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.completedSteps.map((step) => step.id)).toEqual([
      "shipped-localized-docs",
      "published-docs-registry",
    ]);
    expect(result.failedStep.id).toBe("graph-registry-runtime");
    expect(result.commandResult.status).toBe(23);
    expect(errors).toEqual([
      expect.stringContaining('Failed step "graph-registry-runtime"'),
    ]);
  });

  test("prepare:content-runtime succeeds on the repository and is safe to rerun", () => {
    const generatedRuntimeRoot = getGeneratedContentRuntimeRoot(repoRoot);
    const generatedRuntimeRootRelative = relative(
      repoRoot,
      generatedRuntimeRoot,
    );
    const firstRun = spawnSync("bun", ["run", "prepare:content-runtime"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    });
    const secondRun = spawnSync("bun", ["run", "prepare:content-runtime"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    });

    expect(firstRun.status).toBe(0);
    expect(secondRun.status).toBe(0);

    for (const step of CONTENT_RUNTIME_PREPARATION_STEPS) {
      expect(
        step.outputPath.startsWith(`${generatedRuntimeRootRelative}/`),
      ).toBe(true);
      expect(existsSync(join(repoRoot, step.outputPath))).toBe(true);
      expect(
        existsSync(
          join(repoRoot, "src/lib/content", basename(step.outputPath)),
        ),
      ).toBe(false);
    }

    for (const legacyPath of LEGACY_TOP_LEVEL_GENERATED_RUNTIME_PATHS) {
      expect(existsSync(join(repoRoot, legacyPath))).toBe(false);
    }
  });

  test("generated registry runtime is ignored as a derived artifact", () => {
    const generatedRuntimePath = relative(
      repoRoot,
      join(
        getGeneratedContentRuntimeRoot(repoRoot),
        "registry-runtime.generated.ts",
      ),
    );
    const checkIgnore = spawnSync(
      "git",
      ["check-ignore", "--quiet", "--no-index", generatedRuntimePath],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: process.env,
      },
    );

    expect(generatedRuntimePath).toBe(GENERATED_REGISTRY_RUNTIME_RELATIVE_PATH);
    expect(checkIgnore.status).toBe(0);
  });
});
