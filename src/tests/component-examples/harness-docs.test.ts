import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const readmePath = join(repoRoot, "README.md");
const makefilePath = join(repoRoot, "Makefile");
const packageJsonPath = join(repoRoot, "package.json");

describe("component example harness documentation", () => {
  test("README documents make component-examples as the single harness command", () => {
    const readme = readFileSync(readmePath, "utf8");
    expect(readme).toMatch(/make component-examples/);
    expect(readme).toMatch(/component-examples/);
    expect(readme).toMatch(/dev-only|dev only/i);
  });

  test("Makefile and package.json expose the component-examples command", () => {
    const makefile = readFileSync(makefilePath, "utf8");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(makefile).toMatch(/^component-examples:/m);
    expect(packageJson.scripts["component-examples"]).toContain(
      "component-examples.ts",
    );
  });
});
