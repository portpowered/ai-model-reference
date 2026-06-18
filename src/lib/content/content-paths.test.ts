import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ATTENTION_MODULE_PAGE_DIR,
  CONTENT_ROOT,
  DOCS_ROOT,
  GLOSSARY_DOCS_ROOT,
  GROUPED_QUERY_ATTENTION_PAGE_DIR,
  getContentRoot,
  getDocsRoot,
  getGlossaryDocsRoot,
  getMessagesRoot,
  getModulesDocsRoot,
  getProjectRoot,
  getRegistryRoot,
  getTagMessagesRoot,
  MESSAGES_ROOT,
  MODEL_ATLAS_PROJECT_ROOT_ENV,
  MODULES_DOCS_ROOT,
  REGISTRY_ROOT,
  TAG_MESSAGES_ROOT,
  TOKEN_GLOSSARY_PAGE_DIR,
} from "./content-paths";

describe("content-paths", () => {
  let originalCwd: string | undefined;
  let tempCwd: string | undefined;

  afterEach(() => {
    delete process.env[MODEL_ATLAS_PROJECT_ROOT_ENV];
    if (originalCwd) {
      process.chdir(originalCwd);
      originalCwd = undefined;
    }
    if (tempCwd) {
      rmSync(tempCwd, { recursive: true, force: true });
      tempCwd = undefined;
    }
  });

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
    expect(ATTENTION_MODULE_PAGE_DIR).toBe(
      join(MODULES_DOCS_ROOT, "attention"),
    );
    expect(GROUPED_QUERY_ATTENTION_PAGE_DIR).toBe(
      join(MODULES_DOCS_ROOT, "grouped-query-attention"),
    );
    expect(TOKEN_GLOSSARY_PAGE_DIR).toBe(join(GLOSSARY_DOCS_ROOT, "token"));
  });

  test("prefers the explicit project-root override when cwd is a fixture directory", () => {
    originalCwd = process.cwd();
    tempCwd = mkdtempSync(join(tmpdir(), "content-paths-fixture-"));
    process.chdir(tempCwd);
    process.env[MODEL_ATLAS_PROJECT_ROOT_ENV] = originalCwd;

    const projectRoot = getProjectRoot();

    expect(projectRoot).not.toBe(tempCwd);
    expect(projectRoot).toBe(originalCwd);
    expect(getDocsRoot()).toBe(join(projectRoot, "src/content/docs"));
  });
});
