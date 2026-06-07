import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const readmePath = join(repoRoot, "README.md");
const operationsPath = join(repoRoot, "docs/operations.md");
const makefilePath = join(repoRoot, "Makefile");
const packageJsonPath = join(repoRoot, "package.json");

describe("static export build documentation", () => {
  test("README documents make build-export as the single export build and verify command", () => {
    const readme = readFileSync(readmePath, "utf8");

    expect(readme).toMatch(/make build-export/);
    expect(readme).toMatch(/bun run build:export/);
    expect(readme).toMatch(/GITHUB_PAGES_BASE_PATH/);
    expect(readme).toMatch(/make verify-export-routes/);
    expect(readme).toMatch(/bun run verify:export-routes/);
    expect(readme).toMatch(/part of `make ci`|runs in `make ci`/i);
    expect(readme).toMatch(/exits non-zero|exit.*non-zero/i);
    expect(readme).toMatch(/out\/.*missing|missing.*out\//i);
    expect(readme).toMatch(/\/docs\/modules\/grouped-query-attention/);
    expect(readme).toMatch(/\/tags\/attention/);
  });

  test("operations guide documents export build, base path, and verification", () => {
    const operations = readFileSync(operationsPath, "utf8");

    expect(operations).toMatch(/make build-export/);
    expect(operations).toMatch(/make ci.*build-export|build-export.*make ci/i);
    expect(operations).toMatch(/GITHUB_PAGES_BASE_PATH/);
    expect(operations).toMatch(/verify-phase-1-export-routes/);
  });

  test("Makefile and package.json expose export build and verification commands", () => {
    const makefile = readFileSync(makefilePath, "utf8");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(makefile).toMatch(/^build-export:/m);
    expect(makefile).toMatch(/^ci:.*build-export/m);
    expect(makefile).toMatch(/bun run build:export/);
    expect(makefile).toMatch(/verify-phase-1-export-routes\.ts/);
    expect(makefile).toMatch(/^verify-export-routes:/m);
    expect(packageJson.scripts["build:export"]).toContain(
      "NEXT_STATIC_EXPORT=1",
    );
    expect(packageJson.scripts["verify:export-routes"]).toContain(
      "verify-phase-1-export-routes.ts",
    );
  });
});
