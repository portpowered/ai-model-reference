import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { SCAFFOLD_DOC_PAGE_KINDS } from "../../lib/content/scaffold-doc-page";

const repoRoot = join(import.meta.dir, "../../..");
const guidePath = join(repoRoot, "docs/contributors/CONTRIBUTING.md");
const guideDir = dirname(guidePath);
const templatesDir = join(repoRoot, "docs/templates");

const factoryDocPaths = [
  "factory/docs/overview.md",
  "factory/docs/batch-inputs.md",
  "factory/docs/batch-input-example.json",
] as const;

const contributorMakeTargets = [
  "validate-data",
  "linkcheck",
  "lint",
  "typecheck",
  "dev",
  "ci",
  "scaffold",
] as const;

const contributorPackageScripts = [
  "scaffold:doc-page",
  "dev",
  "generate:page-bundle",
] as const;

const contributorScriptPaths = [
  "scripts/validate-registry.ts",
  "scripts/validate-links.ts",
  "scripts/generate-page-bundle.ts",
] as const;

function readGuide(): string {
  if (!existsSync(guidePath)) {
    throw new Error(
      "docs/contributors/CONTRIBUTING.md is missing; contributor workflow guide must exist",
    );
  }
  return readFileSync(guidePath, "utf8");
}

function listTemplateKinds(): string[] {
  return readdirSync(templatesDir)
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => name.replace(/\.mdx$/, ""))
    .sort();
}

function extractMarkdownLinks(markdown: string): string[] {
  const links: string[] = [];
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(linkPattern)) {
    const target = match[1]?.trim();
    if (
      !target ||
      target.startsWith("http://") ||
      target.startsWith("https://")
    ) {
      continue;
    }
    const withoutAnchor = target.split("#")[0];
    if (withoutAnchor.length > 0) {
      links.push(withoutAnchor);
    }
  }
  return links;
}

function resolveGuideLink(linkTarget: string): string {
  return normalize(resolve(guideDir, linkTarget));
}

describe("docs/contributors/CONTRIBUTING.md repository alignment", () => {
  test("exists and references the contributor guide verification test", () => {
    const guide = readGuide();
    expect(guide).toMatch(
      /src\/tests\/ci\/contributor-guide-alignment\.test\.ts/,
    );
    expect(guide).toMatch(/Keeping this guide aligned/i);
  });

  test("documents scaffold support only for checked-in scaffold kinds", () => {
    const guide = readGuide();
    const scaffoldSection = guide.slice(
      guide.indexOf("### Scaffold support boundary"),
      guide.indexOf("### Choosing slug, title, aliases, tags, and registryId"),
    );

    for (const kind of SCAFFOLD_DOC_PAGE_KINDS) {
      expect(scaffoldSection).toContain(kind);
    }

    const nonScaffoldKinds = listTemplateKinds().filter(
      (kind) =>
        kind !== "blog-post" &&
        !SCAFFOLD_DOC_PAGE_KINDS.includes(
          kind as (typeof SCAFFOLD_DOC_PAGE_KINDS)[number],
        ),
    );

    for (const kind of nonScaffoldKinds) {
      expect(scaffoldSection).toContain(kind);
      expect(scaffoldSection).toMatch(/template bundle|templates\//i);
    }
  });

  test("template inventory table matches docs/templates production bundles", () => {
    const guide = readGuide();
    const inventorySection = guide.slice(
      guide.indexOf("### Template inventory in `docs/templates/`"),
      guide.indexOf("### Scaffold support boundary"),
    );

    for (const kind of listTemplateKinds()) {
      expect(inventorySection).toContain(`${kind}.mdx`);
      expect(inventorySection).toContain(`${kind}.content.md`);
      expect(inventorySection).toContain(`${kind}.messages.en.json`);
      expect(inventorySection).toContain(`${kind}.assets.json`);
    }
  });

  test("references factory docs by stable checked-in paths", () => {
    const guide = readGuide();

    for (const relativePath of factoryDocPaths) {
      expect(existsSync(join(repoRoot, relativePath))).toBe(true);
      expect(guide).toContain(relativePath);
    }
  });

  test("documents make targets and package scripts that exist today", () => {
    const guide = readGuide();
    const makefile = readFileSync(join(repoRoot, "Makefile"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    for (const target of contributorMakeTargets) {
      expect(guide).toContain(`make ${target}`);
      expect(makefile).toMatch(new RegExp(`^${target}:`, "m"));
    }

    for (const scriptName of contributorPackageScripts) {
      expect(guide).toContain(scriptName);
      expect(packageJson.scripts[scriptName]).toBeDefined();
    }

    for (const scriptPath of contributorScriptPaths) {
      expect(existsSync(join(repoRoot, scriptPath))).toBe(true);
      expect(guide).toContain(scriptPath);
    }
  });

  test("relative markdown links resolve to checked-in files", () => {
    const guide = readGuide();
    const links = extractMarkdownLinks(guide);

    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const resolved = resolveGuideLink(link);
      expect(existsSync(resolved)).toBe(true);
    }
  });
});
