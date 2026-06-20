import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { getGeneratedContentRuntimeRoot } from "@/lib/content/content-paths";
import {
  CONTENT_RUNTIME_PREPARATION_STEPS,
  type ContentRuntimePreparationCommandResult,
  runContentRuntimePreparation,
} from "@/lib/content/content-runtime-preparation";

const repoRoot = join(import.meta.dir, "../../..");
const LEGACY_TOP_LEVEL_GENERATED_RUNTIME_PATHS = [
  "src/lib/content/published-docs-registry-manifest.ts",
] as const;
const publishedDocsRegistryStep = CONTENT_RUNTIME_PREPARATION_STEPS.find(
  (step) => step.id === "published-docs-registry",
);

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

  test("reports published docs registry generation failures at the generation step", () => {
    if (!publishedDocsRegistryStep) {
      throw new Error("Expected a published-docs-registry preparation step");
    }

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
          status: step === "generate:published-docs-registry" ? 19 : 0,
        } satisfies ContentRuntimePreparationCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.completedSteps.map((step) => step.id)).toEqual([
      "shipped-localized-docs",
    ]);
    expect(result.failedStep).toBe(publishedDocsRegistryStep);
    expect(result.commandResult.status).toBe(19);
    expect(errors).toEqual([
      expect.stringContaining('Failed step "published-docs-registry"'),
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

  test("prepare:content-runtime recreates a missing published docs registry manifest", () => {
    if (!publishedDocsRegistryStep) {
      throw new Error("Expected a published-docs-registry preparation step");
    }

    const manifestPath = join(repoRoot, publishedDocsRegistryStep.outputPath);
    const originalManifest = existsSync(manifestPath)
      ? readFileSync(manifestPath, "utf8")
      : null;

    try {
      rmSync(manifestPath, { force: true });

      const result = spawnSync("bun", ["run", "prepare:content-runtime"], {
        cwd: repoRoot,
        encoding: "utf8",
        env: process.env,
      });

      expect(result.status).toBe(0);
      expect(existsSync(manifestPath)).toBe(true);

      const generatedManifest = readFileSync(manifestPath, "utf8");
      expect(generatedManifest).toContain(
        "Generated by scripts/generate-published-docs-registry.ts",
      );
      expect(generatedManifest).toContain(
        "Do not edit by hand or commit regenerated output.",
      );
      expect(generatedManifest).toContain("GENERATED_PUBLISHED_DOCS_ENTRIES");
      expect(generatedManifest).toContain(
        "GENERATED_PUBLISHED_DOCS_REGISTRY_IDS",
      );
    } finally {
      if (originalManifest === null) {
        rmSync(manifestPath, { force: true });
      } else {
        writeFileSync(manifestPath, originalManifest, "utf8");
      }
    }
  });

  test("published docs registry manifest stays out of the authored git surface", () => {
    if (!publishedDocsRegistryStep) {
      throw new Error("Expected a published-docs-registry preparation step");
    }

    const checkIgnored = spawnSync(
      "git",
      ["check-ignore", "--quiet", publishedDocsRegistryStep.outputPath],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    const checkTracked = spawnSync(
      "git",
      ["ls-files", "--error-unmatch", publishedDocsRegistryStep.outputPath],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(checkIgnored.status).toBe(0);
    expect(checkTracked.status).not.toBe(0);
  });
});
