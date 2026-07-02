import { describe, expect, test } from "bun:test";
import {
  DOCS_COLLECTION_IDS,
  DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS,
  type DocsCollectionDefinition,
  isDocsCollectionSidebarGroupingResolverId,
} from "@/lib/docs/collection-definition-contract";

const trainingDefinition: DocsCollectionDefinition = {
  id: "training",
  routeSlug: "training",
  registryKind: "training-regime",
  frontmatterKind: "training-regime",
  starterSlugs: ["training/on-policy-distillation"],
  messageKeys: {
    browse: {
      sectionTitle: "browseIndex.trainingSectionTitle",
      sectionDescription: "browseIndex.trainingSectionDescription",
      sectionLinkLabel: "browseIndex.trainingSectionLinkLabel",
    },
    index: {
      title: "trainingIndex.title",
      description: "trainingIndex.description",
      listLabel: "trainingIndex.listLabel",
      emptyTitle: "trainingIndex.emptyTitle",
      emptyDescription: "trainingIndex.emptyDescription",
      emptyHomeLink: "trainingIndex.emptyHomeLink",
    },
  },
  sidebarGroupingResolverId: "training",
};

const modelsDefinition: DocsCollectionDefinition = {
  id: "models",
  routeSlug: "models",
  registryKind: "model",
  frontmatterKind: "model",
  starterSlugs: ["models/gpt-3"],
  messageKeys: {
    browse: {
      sectionTitle: "browseIndex.modelsSectionTitle",
      sectionDescription: "browseIndex.modelsSectionDescription",
      sectionLinkLabel: "browseIndex.modelsSectionLinkLabel",
    },
    index: {
      title: "modelsIndex.title",
      description: "modelsIndex.description",
      listLabel: "modelsIndex.listLabel",
      emptyTitle: "modelsIndex.emptyTitle",
      emptyDescription: "modelsIndex.emptyDescription",
      emptyHomeLink: "modelsIndex.emptyHomeLink",
    },
  },
};

describe("collection definition contract", () => {
  test("allows route slug and frontmatter kind to diverge for training", () => {
    expect(trainingDefinition.routeSlug).toBe("training");
    expect(trainingDefinition.frontmatterKind).toBe("training-regime");
    expect(trainingDefinition.registryKind).toBe("training-regime");
  });

  test("allows collections without sidebar grouping resolver ids", () => {
    expect(modelsDefinition.sidebarGroupingResolverId).toBeUndefined();
  });

  test("exports the current AI collection ids", () => {
    expect(DOCS_COLLECTION_IDS).toEqual([
      "glossary",
      "concepts",
      "modules",
      "models",
      "papers",
      "training",
      "systems",
    ]);
  });

  test("constrains sidebar grouping resolver ids", () => {
    expect(isDocsCollectionSidebarGroupingResolverId("modules")).toBe(true);
    expect(isDocsCollectionSidebarGroupingResolverId("models")).toBe(false);
    expect(DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS).not.toContain(
      "models",
    );
    expect(DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS).not.toContain(
      "papers",
    );
  });
});
