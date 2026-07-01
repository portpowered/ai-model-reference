import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  CONCEPTS_DOCS_ROOT,
  CONTENT_ROOT,
  DOCS_ROOT,
  DOCS_SECTIONS,
  GENERATED_CONTENT_RUNTIME_ROOT,
  GENERATED_DOCS_SOURCE_ROOT,
  GLOSSARY_DOCS_ROOT,
  getConceptsDocsRoot,
  getContentRoot,
  getDocsPageDir,
  getDocsRoot,
  getDocsSectionRoot,
  getGeneratedContentRuntimeRoot,
  getGeneratedDocsSourceRoot,
  getGlossaryDocsRoot,
  getMessagesRoot,
  getModelsDocsRoot,
  getModulesDocsRoot,
  getPapersDocsRoot,
  getProjectRoot,
  getRegistryCollectionRoot,
  getRegistryRoot,
  getSystemsDocsRoot,
  getTagMessagesRoot,
  getTrainingDocsRoot,
  MESSAGES_ROOT,
  MODELS_DOCS_ROOT,
  MODULES_DOCS_ROOT,
  PAPERS_DOCS_ROOT,
  REGISTRY_COLLECTIONS,
  REGISTRY_ROOT,
  SYSTEMS_DOCS_ROOT,
  TAG_MESSAGES_ROOT,
  TRAINING_DOCS_ROOT,
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

  test("generic docs page helper derives representative page directories for every docs section", () => {
    const representativePages = [
      { section: "glossary", slug: "token", sectionRoot: GLOSSARY_DOCS_ROOT },
      { section: "concepts", slug: "alibi", sectionRoot: CONCEPTS_DOCS_ROOT },
      {
        section: "modules",
        slug: "grouped-query-attention",
        sectionRoot: MODULES_DOCS_ROOT,
      },
      { section: "models", slug: "gpt-2", sectionRoot: MODELS_DOCS_ROOT },
      {
        section: "papers",
        slug: "attention-is-all-you-need",
        sectionRoot: PAPERS_DOCS_ROOT,
      },
      {
        section: "training",
        slug: "instruction-tuning",
        sectionRoot: TRAINING_DOCS_ROOT,
      },
      { section: "systems", slug: "vllm", sectionRoot: SYSTEMS_DOCS_ROOT },
    ] as const;

    for (const { section, slug, sectionRoot } of representativePages) {
      expect(getDocsPageDir(section, slug)).toBe(join(sectionRoot, slug));
      expect(getDocsPageDir(section, slug)).toBe(
        join(DOCS_ROOT, section, slug),
      );
    }
  });

  test("generic docs page helper preserves section-plus-slug invariants for custom roots", () => {
    const docsRoot = "/tmp/model-reference/docs";
    const representativePages = [
      { section: "glossary", slug: "token" },
      { section: "concepts", slug: "alibi" },
      { section: "modules", slug: "grouped-query-attention" },
      { section: "models", slug: "gpt-2" },
      { section: "papers", slug: "attention-is-all-you-need" },
      { section: "training", slug: "instruction-tuning" },
      { section: "systems", slug: "vllm" },
    ] as const;

    for (const { section, slug } of representativePages) {
      const sectionRoot = getDocsSectionRoot(section, docsRoot);

      expect(sectionRoot).toBe(join(docsRoot, section));
      expect(getDocsPageDir(section, slug, docsRoot)).toBe(
        join(sectionRoot, slug),
      );
    }
  });

  test("generic registry collection helpers derive canonical collection roots", () => {
    for (const collection of REGISTRY_COLLECTIONS) {
      expect(getRegistryCollectionRoot(collection)).toBe(
        join(REGISTRY_ROOT, collection),
      );
    }

    expect(getTagMessagesRoot()).toBe(
      join(getRegistryCollectionRoot("tags"), "messages"),
    );
  });

  test("generic registry helpers preserve collection derivation invariants for custom roots", () => {
    const registryRoot = "/tmp/model-reference/registry";

    for (const collection of REGISTRY_COLLECTIONS) {
      expect(getRegistryCollectionRoot(collection, registryRoot)).toBe(
        join(registryRoot, collection),
      );
    }

    expect(getTagMessagesRoot(registryRoot)).toBe(
      join(registryRoot, "tags", "messages"),
    );
  });

  test("exported production roots match helper-derived paths", () => {
    expect(CONTENT_ROOT.endsWith("src/content")).toBe(true);
    expect(DOCS_ROOT).toBe(getDocsRoot());
    expect(GLOSSARY_DOCS_ROOT).toBe(getGlossaryDocsRoot());
    expect(CONCEPTS_DOCS_ROOT).toBe(getConceptsDocsRoot());
    expect(MODULES_DOCS_ROOT).toBe(getModulesDocsRoot());
    expect(MODELS_DOCS_ROOT).toBe(getModelsDocsRoot());
    expect(PAPERS_DOCS_ROOT).toBe(getPapersDocsRoot());
    expect(TRAINING_DOCS_ROOT).toBe(getTrainingDocsRoot());
    expect(SYSTEMS_DOCS_ROOT).toBe(getSystemsDocsRoot());
    expect(REGISTRY_ROOT).toBe(getRegistryRoot());
    expect(GENERATED_CONTENT_RUNTIME_ROOT).toBe(
      getGeneratedContentRuntimeRoot(),
    );
    expect(GENERATED_DOCS_SOURCE_ROOT).toBe(getGeneratedDocsSourceRoot());
    expect(MESSAGES_ROOT).toBe(getMessagesRoot());
    expect(TAG_MESSAGES_ROOT).toBe(getTagMessagesRoot());
  });
});
