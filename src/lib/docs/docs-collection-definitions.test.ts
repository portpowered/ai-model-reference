import { describe, expect, test } from "bun:test";
import { loadUiMessages } from "@/lib/content/ui-messages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  DOCS_COLLECTION_IDS,
  type DocsCollectionMessageKeys,
} from "@/lib/docs/collection-definition-contract";
import {
  assertDocsCollectionInventory,
  DOCS_COLLECTION_DEFINITIONS,
  getDocsCollectionDefinition,
  listDocsCollectionDefinitions,
} from "@/lib/docs/docs-collection-definitions";

function resolveUiMessagePath(messages: UiMessages, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (current, segment) =>
        current !== null &&
        typeof current === "object" &&
        segment in (current as Record<string, unknown>)
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      messages,
    );

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing UI message for path: ${path}`);
  }

  return value;
}

function expectResolvableMessageKeys(
  messages: UiMessages,
  messageKeys: DocsCollectionMessageKeys,
): void {
  for (const path of [
    messageKeys.browse.sectionTitle,
    messageKeys.browse.sectionDescription,
    messageKeys.browse.sectionLinkLabel,
    messageKeys.index.title,
    messageKeys.index.description,
    messageKeys.index.listLabel,
    messageKeys.index.emptyTitle,
    messageKeys.index.emptyDescription,
    messageKeys.index.emptyHomeLink,
  ]) {
    expect(resolveUiMessagePath(messages, path).length).toBeGreaterThan(0);
  }
}

describe("docs collection definitions config", () => {
  test("represents every current AI collection exactly once", () => {
    assertDocsCollectionInventory();

    expect(
      DOCS_COLLECTION_DEFINITIONS.map((definition) => definition.id),
    ).toEqual([...DOCS_COLLECTION_IDS]);
    expect(listDocsCollectionDefinitions()).toHaveLength(
      DOCS_COLLECTION_IDS.length,
    );
  });

  test("uses current public route slugs for each collection", () => {
    for (const definition of DOCS_COLLECTION_DEFINITIONS) {
      expect(definition.routeSlug).toBe(definition.id);
    }
  });

  test("uses current frontmatter and registry kinds", () => {
    expect(getDocsCollectionDefinition("glossary")).toMatchObject({
      routeSlug: "glossary",
      frontmatterKind: "glossary",
      registryKind: "concept",
    });
    expect(getDocsCollectionDefinition("concepts")).toMatchObject({
      frontmatterKind: "concept",
      registryKind: "concept",
    });
    expect(getDocsCollectionDefinition("modules")).toMatchObject({
      frontmatterKind: "module",
      registryKind: "module",
    });
    expect(getDocsCollectionDefinition("models")).toMatchObject({
      frontmatterKind: "model",
      registryKind: "model",
    });
    expect(getDocsCollectionDefinition("papers")).toMatchObject({
      frontmatterKind: "paper",
      registryKind: "paper",
    });
    expect(getDocsCollectionDefinition("systems")).toMatchObject({
      frontmatterKind: "system",
      registryKind: "system",
    });
  });

  test("maps training route slug to training-regime kinds", () => {
    expect(getDocsCollectionDefinition("training")).toMatchObject({
      id: "training",
      routeSlug: "training",
      frontmatterKind: "training-regime",
      registryKind: "training-regime",
    });
  });

  test("preserves current browse starter slugs as route-relative docs slugs", () => {
    expect(getDocsCollectionDefinition("models").starterSlugs).toEqual([
      "models/gpt-3",
    ]);
    expect(getDocsCollectionDefinition("modules").starterSlugs).toEqual([
      "modules/grouped-query-attention",
      "modules/attention",
      "modules/swiglu",
      "modules/relu",
      "modules/multi-head-attention",
      "modules/feed-forward-network",
    ]);
    expect(getDocsCollectionDefinition("concepts").starterSlugs).toEqual([
      "concepts/transformer-architecture",
      "concepts/positional-encodings",
      "concepts/context-extension",
      "concepts/quantization",
      "concepts/why-long-context-is-hard",
      "concepts/kv-cache-quantization",
    ]);
    expect(getDocsCollectionDefinition("papers").starterSlugs).toEqual([
      "papers/deepseek-v4",
    ]);
    expect(getDocsCollectionDefinition("training").starterSlugs).toEqual([
      "training/on-policy-distillation",
      "training/specialist-training",
      "training/fp4-quantization-aware-training",
    ]);
    expect(getDocsCollectionDefinition("systems").starterSlugs).toEqual([
      "systems/deployment",
      "systems/routing",
      "systems/on-disk-kv-cache",
      "systems/expert-parallel-overlap",
    ]);
    expect(getDocsCollectionDefinition("glossary").starterSlugs).toEqual([
      "glossary/token",
      "glossary/embedding",
      "glossary/logit",
      "glossary/softmax",
      "glossary/kv-cache",
      "glossary/architecture",
    ]);

    for (const definition of DOCS_COLLECTION_DEFINITIONS) {
      expect(definition.starterSlugs.length).toBeGreaterThan(0);
      for (const slug of definition.starterSlugs) {
        expect(slug.startsWith(`${definition.routeSlug}/`)).toBe(true);
      }
    }
  });

  test("includes message keys that resolve to current browse and index copy", async () => {
    const messages = await loadUiMessages();

    for (const definition of DOCS_COLLECTION_DEFINITIONS) {
      expectResolvableMessageKeys(messages, definition.messageKeys);
    }
  });
});
