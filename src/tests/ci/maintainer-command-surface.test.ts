import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const packageJsonPath = join(repoRoot, "package.json");
const makefilePath = join(repoRoot, "Makefile");

const supportedCommands = [
  "dev",
  "build",
  "test",
  "lint",
  "validate",
  "generate",
  "ci",
  "help",
] as const;

const internalMakePrefixes = ["internal-"];

function runBun(args: string[]) {
  return spawnSync("bun", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

function runMake(target: string) {
  return spawnSync("make", [target], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

function parseSupportedHelpLines(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).split(":")[0]?.trim() ?? "")
    .filter(Boolean);
}

function parseSimpleMakeTargets(makefile: string): string[] {
  return makefile
    .split("\n")
    .map((line) => line.match(/^([a-z0-9][a-z0-9-]*):(?:\s|$)/)?.[1] ?? null)
    .filter((target): target is string => target !== null);
}

describe("maintainer command surface", () => {
  test("package.json defines the supported maintainer workflow commands", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    for (const command of supportedCommands) {
      expect(packageJson.scripts[command]).toBeTruthy();
    }

    const topLevelScripts = Object.keys(packageJson.scripts)
      .filter((script) => !script.includes(":"))
      .filter((script) => !script.startsWith("pre"));

    expect(topLevelScripts.sort()).toEqual([...supportedCommands].sort());
  });

  test("Makefile exposes the supported maintainer workflow targets", () => {
    const makefile = readFileSync(makefilePath, "utf8");
    const simpleTargets = parseSimpleMakeTargets(makefile).filter(
      (target) =>
        !internalMakePrefixes.some((prefix) => target.startsWith(prefix)),
    );

    for (const command of supportedCommands) {
      expect(makefile).toContain(`\n${command}:`);
    }

    expect(simpleTargets.sort()).toEqual([...supportedCommands].sort());
  });

  test("make help and bun run help print the same supported workflow summary", () => {
    const makeResult = runMake("help");
    const bunResult = runBun(["run", "help"]);

    expect(makeResult.status).toBe(0);
    expect(bunResult.status).toBe(0);

    const makeOutput = `${makeResult.stdout}${makeResult.stderr}`.trim();
    const bunOutput = `${bunResult.stdout}${bunResult.stderr}`.trim();

    expect(makeOutput).toBe(bunOutput);
    expect(makeOutput).toContain("Supported maintainer workflow commands:");
    expect(parseSupportedHelpLines(makeOutput)).toEqual([...supportedCommands]);
    expect(makeOutput).not.toContain("test-build-contract");
    expect(makeOutput).not.toContain("verify-phase-1-ux");
    expect(makeOutput).not.toContain("build-export");
  });

  test("make internal-help and bun run internal:help print the same internal summary", () => {
    const makeResult = runMake("internal-help");
    const bunResult = runBun(["run", "internal:help"]);

    expect(makeResult.status).toBe(0);
    expect(bunResult.status).toBe(0);

    const makeOutput = `${makeResult.stdout}${makeResult.stderr}`.trim();
    const bunOutput = `${bunResult.stdout}${bunResult.stderr}`.trim();

    expect(makeOutput).toBe(bunOutput);
    expect(makeOutput).toContain("Internal Make/Bun command surface:");
    expect(makeOutput).toContain(
      "internal-build-export / bun run build:export",
    );
    expect(makeOutput).toContain(
      "internal-test-build-contract / bun run test:build-contract",
    );
  });
});
