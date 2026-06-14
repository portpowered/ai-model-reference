import { describe, expect, test } from "bun:test";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "./content-paths";
import { PAGE_SPEC_KINDS } from "./page-spec";
import { SCAFFOLD_DOC_PAGE_KINDS } from "./scaffold-doc-page";

const GENERATION_SURFACES = [
  ["docs", "templates"],
  ["src", "content", "docs"],
  ["src", "content", "registry"],
  ["scripts", "scaffold-doc-page.ts"],
  ["src", "lib", "content", "scaffold-doc-page.ts"],
  ["scripts", "validate-registry.ts"],
  ["src", "lib", "content", "validate-registry.ts"],
  ["scripts", "generate-page-bundle.ts"],
  ["src", "lib", "content", "generate-page-bundle.ts"],
  ["src", "lib", "content", "page-spec.ts"],
  ["src", "lib", "content", "validate-generated-page-bundle.ts"],
  ["src", "lib", "content", "validate-canonical-mdx-prose.ts"],
] as const;

const TEMPLATE_SUFFIXES = [
  ".mdx",
  ".messages.en.json",
  ".assets.json",
] as const;

describe("page-spec workflow inventory", () => {
  test("PAGE_SPEC_KINDS matches production template inventory", async () => {
    const projectRoot = getProjectRoot();
    const templatesRoot = join(projectRoot, "docs", "templates");

    for (const kind of PAGE_SPEC_KINDS) {
      for (const suffix of TEMPLATE_SUFFIXES) {
        const templatePath = join(templatesRoot, `${kind}${suffix}`);
        await access(templatePath);
      }
    }

    expect(PAGE_SPEC_KINDS).toEqual([
      "concept",
      "glossary",
      "module",
      "model",
      "paper",
      "training-regime",
    ]);
  });

  test("legacy scaffold kinds are a subset of page-spec kinds", () => {
    for (const kind of SCAFFOLD_DOC_PAGE_KINDS) {
      expect(PAGE_SPEC_KINDS).toContain(kind);
    }
    expect(SCAFFOLD_DOC_PAGE_KINDS).toEqual(["glossary", "concept"]);
    expect(PAGE_SPEC_KINDS.length).toBeGreaterThan(
      SCAFFOLD_DOC_PAGE_KINDS.length,
    );
  });

  test("documented generation surfaces exist on disk", async () => {
    const projectRoot = getProjectRoot();

    for (const segments of GENERATION_SURFACES) {
      const surfacePath = join(projectRoot, ...segments);
      await access(surfacePath);
    }
  });
});
