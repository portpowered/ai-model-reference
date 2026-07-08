import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { modelPageHref } from "@/lib/content/content-hrefs";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  getModuleById,
  getRegistryRecordById,
  getSystemById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { modelRecordSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { validateRegistryContent } from "@/lib/content/validate-registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const MODEL_SLUG = "gemma";
const MODEL_ID = "model.gemma";
const MODEL_URL = modelPageHref(MODEL_SLUG);
const registryRoot = join(import.meta.dir, "../../../registry");

const REPRESENTATIVE_ALIAS_QUERIES = [
  ["Gemma"],
  ["Gemma 4"],
  ["Google Gemma"],
  ["Google DeepMind Gemma"],
  ["Gemma open models"],
  ["open model"],
  ["multimodal open model"],
  ["on-device model"],
] as const;

const DISCOVERY_TAG_QUERIES = [
  ["mixture of experts"],
  ["context window"],
  ["multimodal model"],
] as const;

const REQUIRED_RELATIONSHIP_IDS = [
  "concept.transformer-architecture",
  "concept.transformer",
  "concept.autoregressive-generation",
  "concept.decoder",
  "concept.multimodal-model",
  "concept.mixture-of-experts",
  "concept.context-window",
  "concept.tokenizers-overview",
  "concept.alignment",
  "module.mixture-of-experts",
  "system.inference-engine",
  "system.deployment",
] as const;

const TOUCHED_RECORD_IDS = [MODEL_ID] as const;

function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

describe("gemma model-family discovery (gemma-model-family-page-current-main-003)", () => {
  test("model.gemma JSON passes modelRecordSchema with canonical discovery metadata", async () => {
    const raw = await readFile(join(registryRoot, "models/gemma.json"), "utf8");
    const parsed = modelRecordSchema.safeParse(JSON.parse(raw));
    expect(parsed.success).toBe(true);

    const model = parsed.data;
    expect(model?.id).toBe(MODEL_ID);
    expect(model?.slug).toBe(MODEL_SLUG);
    expect(model?.kind).toBe("model");
    expect(model?.status).toBe("published");
    expect(model?.family).toBe("gemma");
    expect(model?.sourceType).toBe("open-weights");
    expect(model?.modalities).toEqual(["text", "image", "audio"]);
    expect(model?.aliases).toEqual([
      "Gemma",
      "Google Gemma",
      "Google DeepMind Gemma",
      "Gemma 4",
      "Gemma open models",
      "Gemmaverse",
      "open model",
      "multimodal open model",
      "on-device model",
    ]);
    expect(model?.tags).toEqual([
      "foundations",
      "model-family",
      "context-window",
      "tokenization",
    ]);
    expect(model?.contextLength).toBe(262144);
  });

  test("registry runtime resolves Gemma relationships for transformer, multimodal, MoE, tokenization, serving, and safety paths", () => {
    const model = getModelById(MODEL_ID);
    expect(model).toBeDefined();

    for (const relationshipId of REQUIRED_RELATIONSHIP_IDS) {
      expect(model?.relatedIds).toContain(relationshipId);
    }

    expect(model?.architectureIds).toEqual([
      "concept.transformer-architecture",
      "concept.autoregressive-generation",
      "concept.multimodal-model",
      "concept.mixture-of-experts",
      "concept.context-window",
    ]);
    expect(model?.moduleIds).toEqual(["module.mixture-of-experts"]);
    expect(getModuleById("module.mixture-of-experts")).toBeDefined();
    expect(getSystemById("system.inference-engine")).toBeDefined();
    expect(getSystemById("system.deployment")).toBeDefined();
  });

  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === MODEL_URL);

    expect(document).toBeDefined();
    expect(document?.kind).toBe("model");
    expect(document?.registryId).toBe(MODEL_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Gemma",
        "Google Gemma",
        "Gemma 4",
        "open model",
        "multimodal open model",
        "on-device model",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining([
        "foundations",
        "model-family",
        "context-window",
        "tokenization",
      ]),
    );
    expect(document?.bodyText.length).toBeGreaterThan(200);
  });

  test.each(
    REPRESENTATIVE_ALIAS_QUERIES,
  )("search surfaces the canonical Gemma page for %s", async ([query]) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
  });

  test.each(
    DISCOVERY_TAG_QUERIES,
  )("search includes the Gemma model page for %s", async ([query]) => {
    const results = await docsSearchApi.search(query);

    expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
  });

  test.each([
    "model-family",
    "foundations",
    "context-window",
    "tokenization",
  ] as const)("tag browsing lists Gemma under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("curated related items resolve transformer, multimodal, MoE, tokenization, serving, and safety discovery targets", () => {
    const source = getRegistryRecordById(MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected Gemma model in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "concept.multimodal-model")
        ?.href,
    ).toBe("/docs/glossary/multimodal-model");
    expect(
      items.find((item) => item.registryId === "module.mixture-of-experts")
        ?.href,
    ).toBe("/docs/modules/mixture-of-experts");
    expect(
      items.find((item) => item.registryId === "concept.tokenizers-overview")
        ?.href,
    ).toBe("/docs/concepts/tokenizers-overview");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
    expect(
      items.find((item) => item.registryId === "system.deployment")?.href,
    ).toBe("/docs/systems/deployment");
    expect(
      items.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/concepts/alignment");
  });

  test("RelatedDocs surfaces transformer, multimodal, MoE, tokenization, and serving paths", () => {
    const curatedHtml = renderToStaticMarkup(
      createElement(RelatedDocs, { registryId: MODEL_ID }),
    );

    expect(curatedHtml).toContain('data-testid="curated-related-docs"');
    expect(curatedHtml).toContain(
      'href="/docs/concepts/transformer-architecture"',
    );
    expect(curatedHtml).toContain('href="/docs/glossary/multimodal-model"');
    expect(curatedHtml).toContain('href="/docs/modules/mixture-of-experts"');
    expect(curatedHtml).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(curatedHtml).toContain('href="/docs/systems/inference-engine"');
    expect(curatedHtml).toContain('href="/docs/systems/deployment"');
    expect(curatedHtml).toContain('href="/docs/concepts/alignment"');
  });

  test("registry validation passes for the Gemma discovery slice", async () => {
    const issues = await validateRegistryContent();
    const touchedIssues = issues.filter((issue) =>
      TOUCHED_RECORD_IDS.some((recordId) => issue.message.includes(recordId)),
    );
    expect(touchedIssues).toEqual([]);
  });
});
