import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";
import {
  getGeneratedContentRuntimeRoot,
  getGeneratedDocsSourceRoot,
} from "@/lib/content/content-paths";
import {
  CONTENT_RUNTIME_COMPLETENESS_CONTRACT,
  CONTENT_RUNTIME_PREPARATION_STEPS,
  type ContentRuntimeGitCommandResult,
  type ContentRuntimePreparationCommandResult,
  runContentRuntimeCompletenessGate,
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
const RUNTIME_DISCOVERY_TEST_DOCS_SLUG = "glossary/runtime-recovery-smoke-test";
const RUNTIME_DISCOVERY_TEST_PAGE_RELATIVE_PATH = join(
  "src/content/docs",
  RUNTIME_DISCOVERY_TEST_DOCS_SLUG,
);
const RUNTIME_DISCOVERY_TEST_REGISTRY_ID =
  "concept.runtime-recovery-smoke-test";

function runPrepareContentRuntime() {
  return spawnSync("bun", ["run", "prepare:content-runtime"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

function writePublishedDocsPage(
  pageRelativePath: string,
  frontmatter: {
    kind: string;
    registryId: string;
    status: string;
  },
) {
  const pagePath = join(repoRoot, pageRelativePath);
  mkdirSync(join(pagePath, "messages"), { recursive: true });
  writeFileSync(
    join(pagePath, "page.mdx"),
    `---
kind: "${frontmatter.kind}"
registryId: "${frontmatter.registryId}"
messageNamespace: "local"
assetNamespace: "local"
tags:
  - test
status: ${frontmatter.status}
updatedAt: "2026-06-20"
---
`,
    "utf8",
  );
  writeFileSync(
    join(pagePath, "messages", "en.json"),
    JSON.stringify(
      {
        title: frontmatter.registryId,
        description: `${frontmatter.registryId} description`,
      },
      null,
      2,
    ),
    "utf8",
  );
}

describe("content runtime preparation", () => {
  test("publishes one authoritative completeness contract for all generated runtime outputs", () => {
    expect(CONTENT_RUNTIME_COMPLETENESS_CONTRACT).toHaveLength(5);
    expect(CONTENT_RUNTIME_PREPARATION_STEPS).toBe(
      CONTENT_RUNTIME_COMPLETENESS_CONTRACT,
    );
    expect(CONTENT_RUNTIME_COMPLETENESS_CONTRACT).toEqual([
      {
        id: "shipped-localized-docs",
        command: ["bun", "run", "generate:shipped-localized-docs"],
        outputPath:
          "src/lib/content/generated/shipped-localized-docs.generated.ts",
        gitClassification: "committed",
        owningSurface: "shipped localized docs runtime helpers",
      },
      {
        id: "graph-registry-runtime",
        command: ["bun", "run", "generate:graph-registry-runtime"],
        outputPath:
          "src/lib/content/generated/graph-registry-runtime.generated.ts",
        gitClassification: "ignored",
        owningSurface: "graph registry runtime lookups",
      },
      {
        id: "published-docs-registry",
        command: ["bun", "run", "generate:published-docs-registry"],
        outputPath:
          "src/lib/content/generated/published-docs-registry.generated.ts",
        gitClassification: "ignored",
        owningSurface: "published docs registry manifest",
      },
      {
        id: "registry-runtime",
        command: ["bun", "run", "generate:registry-runtime"],
        outputPath: "src/lib/content/generated/registry-runtime.generated.ts",
        gitClassification: "ignored",
        owningSurface: "main content registry runtime",
      },
      {
        id: "table-registry-runtime",
        command: ["bun", "run", "generate:table-registry"],
        outputPath: "src/lib/content/generated/table-registry.generated.ts",
        gitClassification: "committed",
        owningSurface: "table registry runtime payloads",
      },
    ]);
  });

  test("runs required runtime generation steps in canonical order", () => {
    const commands: string[] = [];
    const lifecycle: string[] = [];
    const result = runContentRuntimePreparation({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      removeDirectory(path) {
        lifecycle.push(`remove ${relative(repoRoot, path)}`);
      },
      runCommand(command) {
        lifecycle.push(`run ${command.join(" ")}`);
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
    expect(lifecycle[0]).toBe("remove .source");
    expect(lifecycle.slice(1)).toEqual(
      CONTENT_RUNTIME_PREPARATION_STEPS.map(
        (step) => `run ${step.command.join(" ")}`,
      ),
    );
    expect(commands).toEqual(
      CONTENT_RUNTIME_PREPARATION_STEPS.map((step) => step.command.join(" ")),
    );
    expect(CONTENT_RUNTIME_PREPARATION_STEPS).toContainEqual({
      id: "graph-registry-runtime",
      command: ["bun", "run", "generate:graph-registry-runtime"],
      outputPath:
        "src/lib/content/generated/graph-registry-runtime.generated.ts",
      gitClassification: "ignored",
      owningSurface: "graph registry runtime lookups",
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

  test("completeness gate fails with targeted guidance when a required ignored runtime output is still missing after preparation", () => {
    const result = runContentRuntimeCompletenessGate({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      runPreparation() {
        return {
          ok: true,
          completedSteps: [...CONTENT_RUNTIME_PREPARATION_STEPS],
        };
      },
      fileExists(path) {
        return !path.endsWith("graph-registry-runtime.generated.ts");
      },
      runGitCommand(command) {
        if (command[1] === "ls-files") {
          return {
            signal: null,
            status: 0,
            stdout: command[command.length - 1],
            stderr: "",
          } satisfies ContentRuntimeGitCommandResult;
        }

        return {
          signal: null,
          status: 1,
          stdout: "",
          stderr: "",
        } satisfies ContentRuntimeGitCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("verification");
    expect(result.step?.id).toBe("graph-registry-runtime");
    expect(result.message).toContain(
      "src/lib/content/generated/graph-registry-runtime.generated.ts",
    );
    expect(result.message).toContain("graph registry runtime lookups");
    expect(result.repairGuidance).toContain(
      "bun run generate:graph-registry-runtime",
    );
    expect(result.repairGuidance).toContain("leave it out of the commit");
  });

  test("completeness gate fails when a required committed runtime output is classified as ignored", () => {
    const result = runContentRuntimeCompletenessGate({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      runPreparation() {
        return {
          ok: true,
          completedSteps: [...CONTENT_RUNTIME_PREPARATION_STEPS],
        };
      },
      fileExists() {
        return true;
      },
      runGitCommand(command) {
        const targetPath = command[command.length - 1];
        if (
          targetPath ===
          "src/lib/content/generated/shipped-localized-docs.generated.ts"
        ) {
          if (command[1] === "ls-files") {
            return {
              signal: null,
              status: 1,
              stdout: "",
              stderr: "",
            } satisfies ContentRuntimeGitCommandResult;
          }

          return {
            signal: null,
            status: 0,
            stdout: targetPath,
            stderr: "",
          } satisfies ContentRuntimeGitCommandResult;
        }

        if (command[1] === "ls-files") {
          return {
            signal: null,
            status: 0,
            stdout: targetPath,
            stderr: "",
          } satisfies ContentRuntimeGitCommandResult;
        }

        return {
          signal: null,
          status: 1,
          stdout: "",
          stderr: "",
        } satisfies ContentRuntimeGitCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("verification");
    expect(result.step?.id).toBe("shipped-localized-docs");
    expect(result.message).toContain('git classification "ignored"');
    expect(result.message).toContain('requires "committed"');
    expect(result.message).toContain("shipped localized docs runtime helpers");
    expect(result.repairGuidance).toContain(
      "commit the regenerated file because this runtime module is authoritative repo state",
    );
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

  test("prepare:content-runtime recreates the ignored published docs manifest before runtime import", () => {
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

      const prepareResult = runPrepareContentRuntime();
      const prepareOutput = `${prepareResult.stdout}\n${prepareResult.stderr}`;

      expect(prepareResult.status).toBe(0);
      expect(prepareOutput).toContain(
        `[content-runtime] Preparing published-docs-registry -> ${GENERATED_PUBLISHED_DOCS_REGISTRY_RELATIVE_PATH}`,
      );
      expect(existsSync(manifestPath)).toBe(true);

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
      expect(existsSync(manifestPath)).toBe(true);
    } finally {
      if (originalManifest === null) {
        rmSync(manifestPath, { force: true });
      } else {
        writeFileSync(manifestPath, originalManifest, "utf8");
      }
    }
  });

  test("fresh-checkout preparation refreshes the published docs manifest so newly authored pages appear without a manual manifest edit", () => {
    const manifestPath = join(
      repoRoot,
      GENERATED_PUBLISHED_DOCS_REGISTRY_RELATIVE_PATH,
    );
    const pagePath = join(repoRoot, RUNTIME_DISCOVERY_TEST_PAGE_RELATIVE_PATH);
    const originalManifest = existsSync(manifestPath)
      ? readFileSync(manifestPath, "utf8")
      : null;

    try {
      rmSync(manifestPath, { force: true });
      rmSync(pagePath, { force: true, recursive: true });
      writePublishedDocsPage(RUNTIME_DISCOVERY_TEST_PAGE_RELATIVE_PATH, {
        kind: "glossary",
        registryId: RUNTIME_DISCOVERY_TEST_REGISTRY_ID,
        status: "published",
      });

      const prepareResult = runPrepareContentRuntime();
      const prepareOutput = `${prepareResult.stdout}\n${prepareResult.stderr}`;

      expect(prepareResult.status).toBe(0);
      expect(prepareOutput).toContain(
        `[content-runtime] Preparing published-docs-registry -> ${GENERATED_PUBLISHED_DOCS_REGISTRY_RELATIVE_PATH}`,
      );
      expect(existsSync(manifestPath)).toBe(true);

      const importResult = spawnSync(
        "bun",
        [
          "--eval",
          [
            'import { getPublishedDocsEntryByRegistryId, listPublishedDocsEntries } from "./src/lib/content/published-docs-registry-ids";',
            `const registryId = "${RUNTIME_DISCOVERY_TEST_REGISTRY_ID}";`,
            "const entry = getPublishedDocsEntryByRegistryId(registryId);",
            "if (!entry) throw new Error('missing published docs entry for ' + registryId);",
            "const listed = listPublishedDocsEntries().some((candidate) => candidate.registryId === registryId);",
            "if (!listed) throw new Error('listPublishedDocsEntries omitted ' + registryId);",
            "console.log(JSON.stringify({ docsSlug: entry.docsSlug, url: entry.url, listed }));",
          ].join(" "),
        ],
        {
          cwd: repoRoot,
          encoding: "utf8",
          env: process.env,
        },
      );

      expect(importResult.status).toBe(0);
      expect(importResult.stdout).toContain(RUNTIME_DISCOVERY_TEST_DOCS_SLUG);
      expect(importResult.stdout).toContain(
        "/docs/glossary/runtime-recovery-smoke-test",
      );
      expect(importResult.stdout).toContain('"listed":true');
      expect(existsSync(manifestPath)).toBe(true);
    } finally {
      rmSync(pagePath, { force: true, recursive: true });
      if (originalManifest === null) {
        rmSync(manifestPath, { force: true });
      } else {
        writeFileSync(manifestPath, originalManifest, "utf8");
      }
    }
  });

  test(
    "prepare:content-runtime clears stale Fumadocs bindings so deleted docs pages disappear after regeneration",
    () => {
      const pagePath = join(
        repoRoot,
        RUNTIME_DISCOVERY_TEST_PAGE_RELATIVE_PATH,
      );
      const sourceRoot = getGeneratedDocsSourceRoot(repoRoot);
      const sourceServerPath = join(sourceRoot, "server.ts");

      try {
        rmSync(sourceRoot, { force: true, recursive: true });
        rmSync(pagePath, { force: true, recursive: true });
        writePublishedDocsPage(RUNTIME_DISCOVERY_TEST_PAGE_RELATIVE_PATH, {
          kind: "glossary",
          registryId: RUNTIME_DISCOVERY_TEST_REGISTRY_ID,
          status: "published",
        });

        const firstPrepare = runPrepareContentRuntime();
        expect(firstPrepare.status).toBe(0);

        const firstGenerate = spawnSync("bunx", ["fumadocs-mdx"], {
          cwd: repoRoot,
          encoding: "utf8",
          env: process.env,
        });
        expect(firstGenerate.status).toBe(0);
        expect(existsSync(sourceServerPath)).toBe(true);
        expect(readFileSync(sourceServerPath, "utf8")).toContain(
          RUNTIME_DISCOVERY_TEST_DOCS_SLUG,
        );

        rmSync(pagePath, { force: true, recursive: true });

        const secondPrepare = runPrepareContentRuntime();
        expect(secondPrepare.status).toBe(0);
        expect(existsSync(sourceRoot)).toBe(false);

        const secondGenerate = spawnSync("bunx", ["fumadocs-mdx"], {
          cwd: repoRoot,
          encoding: "utf8",
          env: process.env,
        });
        expect(secondGenerate.status).toBe(0);
        expect(existsSync(sourceServerPath)).toBe(true);

        const regeneratedServer = readFileSync(sourceServerPath, "utf8");
        expect(regeneratedServer).not.toContain(
          RUNTIME_DISCOVERY_TEST_DOCS_SLUG,
        );
        expect(regeneratedServer).toContain("modules/grouped-query-attention");
      } finally {
        rmSync(pagePath, { force: true, recursive: true });
        rmSync(sourceRoot, { force: true, recursive: true });
        runPrepareContentRuntime();
      }
    },
    { timeout: CONTENT_RUNTIME_PREPARATION_TIMEOUT_MS },
  );

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

  test("verify:content-runtime-completeness succeeds on the healthy repo checkout", () => {
    const result = spawnSync(
      "bun",
      ["run", "verify:content-runtime-completeness"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: process.env,
      },
    );

    expect(result.status).toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "Generated-runtime completeness gate passed",
    );
  });
});
