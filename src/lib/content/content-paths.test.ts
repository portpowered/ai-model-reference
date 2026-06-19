import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  CONTENT_ROOT,
  DOCS_ROOT,
  DOCS_SECTION_NAMES,
  GLOSSARY_DOCS_ROOT,
  getContentRoot,
  getDocsPageDir,
  getDocsRoot,
  getDocsSectionRoot,
  getGlossaryDocsRoot,
  getMessagesRoot,
  getModulesDocsRoot,
  getProjectRoot,
  getRegistryRoot,
  getTagMessagesRoot,
  MESSAGES_ROOT,
  MODULES_DOCS_ROOT,
  REGISTRY_ROOT,
  TAG_MESSAGES_ROOT,
} from "./content-paths";

describe("content-paths", () => {
  test("roots resolve under src/content from the project directory", () => {
    const projectRoot = getProjectRoot();
    const contentRoot = getContentRoot(projectRoot);

    expect(contentRoot).toBe(join(projectRoot, "src/content"));
    expect(getDocsRoot(contentRoot)).toBe(join(contentRoot, "docs"));
    expect(getGlossaryDocsRoot()).toBe(join(contentRoot, "docs", "glossary"));
    expect(getModulesDocsRoot()).toBe(join(contentRoot, "docs", "modules"));
    expect(getRegistryRoot(contentRoot)).toBe(join(contentRoot, "registry"));
    expect(getMessagesRoot(contentRoot)).toBe(join(contentRoot, "messages"));
    expect(getTagMessagesRoot()).toBe(
      join(contentRoot, "registry", "tags", "messages"),
    );
  });

  test("exported production roots match helper-derived paths", () => {
    expect(DOCS_ROOT).toBe(getDocsRoot());
    expect(GLOSSARY_DOCS_ROOT).toBe(getGlossaryDocsRoot());
    expect(MODULES_DOCS_ROOT).toBe(getModulesDocsRoot());
    expect(REGISTRY_ROOT).toBe(getRegistryRoot());
    expect(MESSAGES_ROOT).toBe(getMessagesRoot());
    expect(TAG_MESSAGES_ROOT).toBe(getTagMessagesRoot());
    expect(CONTENT_ROOT.endsWith("src/content")).toBe(true);
  });

  test("section and page helpers derive paths without a central page inventory", () => {
    expect(DOCS_SECTION_NAMES).toEqual([
      "glossary",
      "concepts",
      "modules",
      "models",
      "papers",
      "training",
      "systems",
    ]);
    expect(getDocsSectionRoot("modules")).toBe(MODULES_DOCS_ROOT);
    expect(getDocsPageDir("modules", "attention")).toBe(
      join(MODULES_DOCS_ROOT, "attention"),
    );
    expect(getDocsPageDir("modules", "grouped-query-attention")).toBe(
      join(MODULES_DOCS_ROOT, "grouped-query-attention"),
    );
    expect(getDocsPageDir("glossary", "token")).toBe(
      join(GLOSSARY_DOCS_ROOT, "token"),
    );
  });
});
