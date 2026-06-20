import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const ciWorkflowPath = join(repoRoot, ".github/workflows/ci.yml");
const makefilePath = join(repoRoot, "Makefile");
const buildTracingRegressionTestPath = join(
  repoRoot,
  "src/tests/build/next-build-tracing-warning.test.ts",
);

const ciTargets = [
  "lint",
  "typecheck",
  "test",
  "test-verify-contract",
  "coverage",
  "test-build-contract",
  "test-integration",
  "validate-data",
  "linkcheck",
] as const;

const excludedCiTargets = [
  "validate-pdf",
  "deploy",
  "build-search-index",
] as const;

type WorkflowMatrixEntry = {
  name: string;
  command: string;
  installPlaywright: boolean;
  websiteTestParallelWorkers?: number;
};

type PackageScripts = Record<string, string>;

function parseMakefileCiPrerequisites(makefile: string): string[] {
  const ciLine = makefile
    .split("\n")
    .find((line) => line.startsWith("ci:") && !line.startsWith(".PHONY"));
  if (!ciLine) {
    throw new Error("Makefile is missing a ci: target");
  }
  return ciLine.slice("ci:".length).trim().split(/\s+/).filter(Boolean);
}

function parseWorkflowMatrixEntries(workflow: string): WorkflowMatrixEntry[] {
  const match = workflow.match(
    /include:\n((?:\s+- name: [^\n]+\n(?:\s{12,}.+\n)*)+)/,
  );
  if (!match?.[1]) {
    throw new Error("CI workflow is missing matrix include entries");
  }

  return match[1]
    .split(/\n(?=\s+- name: )/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const name = block.match(/^- name:\s+([^\n]+)/m)?.[1]?.trim();
      const command = block.match(/^\s*command:\s+([^\n]+)/m)?.[1]?.trim();
      if (!name || !command) {
        throw new Error(`Invalid CI matrix entry:\n${block}`);
      }

      return {
        name,
        command,
        installPlaywright: /^\s*install_playwright:\s*true\s*$/m.test(block),
        websiteTestParallelWorkers: (() => {
          const raw = block.match(
            /^\s*website_test_parallel_workers:\s+([^\n]+)/m,
          )?.[1];
          if (!raw) {
            return undefined;
          }

          return Number.parseInt(raw, 10);
        })(),
      };
    });
}

describe("GitHub Actions make ci", () => {
  test("ci workflow fans CI gates out after frozen lockfile install and keeps a final ci status job", () => {
    const workflow = readFileSync(ciWorkflowPath, "utf8");

    const frozenInstallIndex = workflow.indexOf(
      "bun install --frozen-lockfile",
    );
    const matrixIndex = workflow.indexOf("matrix:");
    const finalCiJobIndex = workflow.indexOf("\n  ci:\n");

    expect(frozenInstallIndex).toBeGreaterThan(-1);
    expect(matrixIndex).toBeGreaterThan(-1);
    expect(finalCiJobIndex).toBeGreaterThan(matrixIndex);
    expect(workflow).not.toContain("run: make ci");
    expect(workflow).toContain("needs: gate");
    expect(workflow).toMatch(/if: \$\{\{ always\(\) \}\}/);
    expect(workflow).toMatch(/if: \$\{\{ matrix\.install_playwright \}\}/);
    expect(workflow).toMatch(
      /WEBSITE_TEST_PARALLEL_WORKERS: \$\{\{ matrix\.website_test_parallel_workers \}\}/,
    );
    expect(workflow).not.toMatch(/continue-on-error:\s*true/i);
  });

  test("make ci splits website tests from explicit verifier and build-contract tests", () => {
    expect(existsSync(buildTracingRegressionTestPath)).toBe(true);

    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as {
      scripts: PackageScripts;
    };
    const scripts = packageJson.scripts;

    expect(scripts["prepare:content-runtime"]).toBe(
      "bun ./scripts/prepare-content-runtime.ts",
    );
    expect(scripts["verify:content-runtime-completeness"]).toBe(
      "bun ./scripts/verify-content-runtime-completeness.ts",
    );
    expect(scripts.predev).toBe("bun run prepare:content-runtime");
    expect(scripts.prestart).toBe("bun run prepare:content-runtime");
    expect(scripts.prebuild).toBe("bun run prepare:content-runtime");
    expect(scripts["prebuild:export"]).toBe("bun run prepare:content-runtime");
    expect(scripts.pretypecheck).toBe(
      "bun run prepare:content-runtime && fumadocs-mdx",
    );
    expect(scripts.pretest).toBe(
      "bun run prepare:content-runtime && fumadocs-mdx",
    );
    expect(scripts["pretest:build-contract"]).toBe(
      "bun run prepare:content-runtime && fumadocs-mdx",
    );
    expect(scripts["pretest:verify-contract"]).toBe(
      "bun run prepare:content-runtime && fumadocs-mdx",
    );
    expect(scripts.precoverage).toBe(
      "bun run prepare:content-runtime && fumadocs-mdx",
    );
    expect(scripts["prevalidate-data"]).toBe("bun run prepare:content-runtime");
    expect(scripts.prelinkcheck).toBe(
      "bun run prepare:content-runtime && fumadocs-mdx",
    );
    expect(scripts.linkcheck).toBe("bun ./scripts/validate-links.ts");
    expect(scripts.test).toBe("bun run test:website");
    expect(scripts["test:verify-contract"]).toBe(
      "bun ./scripts/run-website-verifier-tests.ts",
    );
    expect(scripts.build).toContain(
      "fumadocs-mdx && bun ./scripts/run-next.ts build --webpack",
    );
    expect(scripts["build:export"]).toContain(
      "fumadocs-mdx && NEXT_STATIC_EXPORT=1 bun ./scripts/run-next.ts build --webpack",
    );
    expect(scripts["test:build-contract"]).toContain(
      "src/tests/build/next-build-tracing-warning.test.ts",
    );
    expect(scripts["test:build-contract"]).toContain(
      "src/tests/build/static-export-base-path-contract.test.ts",
    );
    expect(scripts["test:build-contract"]).not.toContain(
      "static-export-contract.test.ts",
    );
    expect(scripts["test:build-contract"]).not.toContain(
      "static-export-search-ux-integration.test.ts",
    );

    const workflow = readFileSync(ciWorkflowPath, "utf8");
    expect(workflow).not.toMatch(/--exclude/i);
    expect(workflow).not.toMatch(/next-build-tracing-warning/i);
    expect(workflow).toContain("command: make test");
    expect(workflow).toContain("command: make test-verify-contract");
    expect(workflow).toContain("command: make test-build-contract");
    expect(workflow).toContain("command: make build-export");
    expect(workflow).toContain("command: make test-integration");

    const matrixEntries = parseWorkflowMatrixEntries(workflow);
    const testVerifyContract = matrixEntries.find(
      (entry) => entry.name === "test-verify-contract",
    );
    const test = matrixEntries.find((entry) => entry.name === "test");
    const testBuildContract = matrixEntries.find(
      (entry) => entry.name === "test-build-contract",
    );
    const buildExport = matrixEntries.find(
      (entry) => entry.name === "build-export",
    );
    const testIntegration = matrixEntries.find(
      (entry) => entry.name === "test-integration",
    );

    expect(test?.websiteTestParallelWorkers).toBe(1);
    expect(testVerifyContract?.installPlaywright).toBe(true);
    expect(testBuildContract?.installPlaywright).toBe(true);
    expect(buildExport?.command).toBe("make build-export");
    expect(buildExport?.installPlaywright).toBe(true);
    expect(testIntegration?.installPlaywright).toBe(true);

    const makefile = readFileSync(makefilePath, "utf8");
    expect(makefile).toContain("linkcheck:\n\tbun run linkcheck");
    expect(makefile).toContain(
      "verify-content-runtime-completeness:\n\tbun run verify:content-runtime-completeness",
    );
    expect(parseMakefileCiPrerequisites(makefile)).toContain("test");
    expect(parseMakefileCiPrerequisites(makefile)).toContain(
      "test-verify-contract",
    );
    expect(parseMakefileCiPrerequisites(makefile)).toContain(
      "test-build-contract",
    );
    expect(parseMakefileCiPrerequisites(makefile)).not.toContain("build");
    expect(parseMakefileCiPrerequisites(makefile)).not.toContain(
      "build-export",
    );
  });

  test("Makefile ci target runs CI gates in order including linkcheck", () => {
    const makefile = readFileSync(makefilePath, "utf8");
    const prerequisites = parseMakefileCiPrerequisites(makefile);

    expect(prerequisites).toEqual([...ciTargets]);

    for (const excluded of excludedCiTargets) {
      expect(prerequisites).not.toContain(excluded);
    }
  });

  test("ci workflow matrix covers every Makefile ci prerequisite and the deploy-path build once", () => {
    const workflow = readFileSync(ciWorkflowPath, "utf8");
    const matrixEntries = parseWorkflowMatrixEntries(workflow);
    const commands = matrixEntries.map((entry) =>
      entry.command.replace(/^make\s+/, ""),
    );

    expect(commands).toHaveLength(ciTargets.length + 1);
    expect([...commands].sort()).toEqual([...ciTargets, "build-export"].sort());
  });

  test("make ci stops on the first failing prerequisite", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "make-ci-abort-"));

    try {
      writeFileSync(
        join(fixtureRoot, "Makefile"),
        [
          ".PHONY: ci lint typecheck",
          "ci: lint typecheck",
          "lint:",
          "\texit 1",
          "typecheck:",
          "\t@echo typecheck-should-not-run",
        ].join("\n"),
      );

      const result = spawnSync("make", ["ci"], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });

      expect(result.status).not.toBe(0);
      expect(result.stdout ?? "").not.toContain("typecheck-should-not-run");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
