import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  CONTENT_ROOT,
  DOCS_ROOT,
  DOCS_SECTIONS,
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
  TOKEN_GLOSSARY_PAGE_DIR,
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

  test("generic docs section helpers derive canonical section roots", () => {
    for (const section of DOCS_SECTIONS) {
      expect(getDocsSectionRoot(section)).toBe(join(DOCS_ROOT, section));
    }

    expect(getGlossaryDocsRoot()).toBe(getDocsSectionRoot("glossary"));
    expect(getModulesDocsRoot()).toBe(getDocsSectionRoot("modules"));
  });

  test("generic docs page helper derives representative page directories", () => {
    expect(getDocsPageDir("glossary", "token")).toBe(
      join(GLOSSARY_DOCS_ROOT, "token"),
    );
    expect(getDocsPageDir("modules", "grouped-query-attention")).toBe(
      join(MODULES_DOCS_ROOT, "grouped-query-attention"),
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
    expect(TOKEN_GLOSSARY_PAGE_DIR).toBe(getDocsPageDir("glossary", "token"));
  });
});
