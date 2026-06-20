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
const CONTENT_RUNTIME_PREPARATION_TIMEOUT_MS = 30_000;
const GENERATED_REGISTRY_RUNTIME_RELATIVE_PATH =
  "src/lib/content/generated/registry-runtime.generated.ts";
const INVALID_REGISTRY_FIXTURE_RELATIVE_PATH =
  "src/content/registry/modules/__invalid-runtime-preparation-test.json";
const LEGACY_TOP_LEVEL_GENERATED_RUNTIME_PATHS = [
  "src/lib/content/published-docs-registry-manifest.ts",
] as const;
const GENERATED_PUBLISHED_DOCS_REGISTRY_RELATIVE_PATH =
  "src/lib/content/generated/published-docs-registry.generated.ts";

function runPrepareContentRuntime() {
  return spawnSync("bun", ["run", "prepare:content-runtime"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

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
    expect(CONTENT_RUNTIME_PREPARATION_STEPS).toContainEqual({
      id: "graph-registry-runtime",
      command: ["bun", "run", "generate:graph-registry-runtime"],
      outputPath:
        "src/lib/content/generated/graph-registry-runtime.generated.ts",
    });
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
    ]);
    expect(result.failedStep.id).toBe("graph-registry-runtime");
    expect(result.commandResult.status).toBe(23);
    expect(errors).toEqual([
      expect.stringContaining('Failed step "graph-registry-runtime"'),
    ]);
  });

  test(
    "prepare:content-runtime recreates the generated registry runtime when absent",
    () => {
      const generatedRuntimeRoot = getGeneratedContentRuntimeRoot(repoRoot);
      const generatedRuntimeRootRelative = relative(
        repoRoot,
        generatedRuntimeRoot,
      );
      const generatedRegistryRuntimePath = join(
        repoRoot,
        GENERATED_REGISTRY_RUNTIME_RELATIVE_PATH,
      );

      rmSync(generatedRegistryRuntimePath, { force: true });
      expect(existsSync(generatedRegistryRuntimePath)).toBe(false);

      const firstRun = runPrepareContentRuntime();
      const secondRun = runPrepareContentRuntime();
      const firstRunOutput = `${firstRun.stdout}\n${firstRun.stderr}`;

      expect(firstRun.status).toBe(0);
      expect(secondRun.status).toBe(0);
      expect(firstRunOutput).toContain(
        `[content-runtime] Preparing registry-runtime -> ${GENERATED_REGISTRY_RUNTIME_RELATIVE_PATH}`,
      );
      expect(existsSync(generatedRegistryRuntimePath)).toBe(true);

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
    },
    { timeout: CONTENT_RUNTIME_PREPARATION_TIMEOUT_MS },
  );

  test("published docs runtime imports succeed without the ignored generated manifest", () => {
    const manifestPath = join(
      repoRoot,
      GENERATED_PUBLISHED_DOCS_REGISTRY_RELATIVE_PATH,
    );
    const originalManifest = existsSync(manifestPath)
      ? readFileSync(manifestPath, "utf8")
      : null;

    try {
      rmSync(manifestPath, { force: true });
      expect(existsSync(manifestPath)).toBe(false);

      const importResult = spawnSync(
        "bun",
        [
          "--eval",
          [
            'import { getPublishedDocsEntryByRegistryId } from "./src/lib/content/published-docs-registry-ids";',
            'const entry = getPublishedDocsEntryByRegistryId("module.grouped-query-attention");',
            'if (!entry) throw new Error("missing grouped-query-attention published docs entry");',
            "console.log(entry.docsSlug);",
          ].join(" "),
        ],
        {
          cwd: repoRoot,
          encoding: "utf8",
          env: process.env,
        },
      );

      expect(importResult.status).toBe(0);
      expect(importResult.stdout).toContain("modules/grouped-query-attention");
      expect(existsSync(manifestPath)).toBe(false);

      const prepareResult = runPrepareContentRuntime();
      const prepareOutput = `${prepareResult.stdout}\n${prepareResult.stderr}`;

      expect(prepareResult.status).toBe(0);
      expect(prepareOutput).not.toContain("published-docs-registry");
      expect(existsSync(manifestPath)).toBe(false);
    } finally {
      if (originalManifest === null) {
        rmSync(manifestPath, { force: true });
      } else {
        writeFileSync(manifestPath, originalManifest, "utf8");
      }
    }
  });

  test("published docs registry manifest stays out of the authored git surface", () => {
    const checkIgnored = spawnSync(
      "git",
      [
        "check-ignore",
        "--quiet",
        GENERATED_PUBLISHED_DOCS_REGISTRY_RELATIVE_PATH,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    const checkTracked = spawnSync(
      "git",
      [
        "ls-files",
        "--error-unmatch",
        GENERATED_PUBLISHED_DOCS_REGISTRY_RELATIVE_PATH,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(checkIgnored.status).toBe(0);
    expect(checkTracked.status).not.toBe(0);
  });

  test("prepare:content-runtime reports the registry runtime step for invalid registry JSON", () => {
    const invalidRegistryFixturePath = join(
      repoRoot,
      INVALID_REGISTRY_FIXTURE_RELATIVE_PATH,
    );
    writeFileSync(
      invalidRegistryFixturePath,
      "{ invalid registry json",
      "utf8",
    );

    try {
      const result = runPrepareContentRuntime();
      const output = `${result.stdout}\n${result.stderr}`;

      expect(result.status).not.toBe(0);
      expect(output).toContain('Failed step "registry-runtime"');
      expect(output).toContain("bun run generate:registry-runtime");
      expect(output).toContain(INVALID_REGISTRY_FIXTURE_RELATIVE_PATH);
    } finally {
      rmSync(invalidRegistryFixturePath, { force: true });
      runPrepareContentRuntime();
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
