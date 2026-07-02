import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import qwen35Messages from "@/content/docs/models/qwen3-5-0-8b/messages/en.json";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const MODEL_ID = "model.qwen3-5-0-8b";
const MODEL_URL = "/docs/models/qwen3-5-0-8b";
const DENSE_QWEN36_ID = "model.qwen-3-6-27b";
const MOE_QWEN36_ID = "model.qwen-3-6-35b-a3b";
const DENSE_QWEN36_URL = "/docs/models/qwen-3-6-27b";
const MOE_QWEN36_URL = "/docs/models/qwen-3-6-35b-a3b";

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

describe("Qwen3.5-0.8B discovery paths", () => {
  test("registry cross-links the small Qwen3.5 checkpoint with both Qwen3.6 operating points", () => {
    const small = getModelById(MODEL_ID);
    const dense = getModelById(DENSE_QWEN36_ID);
    const moe = getModelById(MOE_QWEN36_ID);

    expect(small?.relatedIds).toContain(DENSE_QWEN36_ID);
    expect(small?.relatedIds).toContain(MOE_QWEN36_ID);
    expect(dense?.relatedIds).toContain(MODEL_ID);
    expect(moe?.relatedIds).toContain(MODEL_ID);
  });

  test("curated related items resolve to Qwen3.6, attention, context, multimodal, and inference paths", () => {
    const source = getRegistryRecordById(MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected Qwen3.5-0.8B model in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === DENSE_QWEN36_ID)?.href,
    ).toBe(DENSE_QWEN36_URL);
    expect(items.find((item) => item.registryId === MOE_QWEN36_ID)?.href).toBe(
      MOE_QWEN36_URL,
    );
    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "concept.context-window")?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      items.find((item) => item.registryId === "concept.multimodal-model")
        ?.href,
    ).toBe("/docs/glossary/multimodal-model");
    expect(
      items.find((item) => item.registryId === "concept.modality")?.href,
    ).toBe("/docs/glossary/modality");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
  });

  test("RelatedDocs renders registry-backed discovery links on the Qwen3.5 page", () => {
    const html = renderToStaticMarkup(<RelatedDocs registryId={MODEL_ID} />);

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain(`href="${DENSE_QWEN36_URL}"`);
    expect(html).toContain(`href="${MOE_QWEN36_URL}"`);
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/glossary/modality"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
  });

  test("DerivedRelatedDocs surfaces Qwen3.6 peers through curated-related", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId={MODEL_ID}
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );

    expect(html).toContain(`href="${DENSE_QWEN36_URL}"`);
    expect(html).toContain(`href="${MOE_QWEN36_URL}"`);
    expect(html).toContain('data-related-group="curated-related"');
  });

  test("search documents carry canonical aliases, tags, and Model Atlas AI facets", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === MODEL_URL);

    expect(document).toBeDefined();
    expect(document?.kind).toBe("model");
    expect(document?.registryId).toBe(MODEL_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Qwen3.5-0.8B",
        "Qwen 3.5 0.8B",
        "Qwen3.5 small model",
        "Qwen3.5 multimodal model",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining([
        "foundations",
        "model-family",
        "context-window",
        "attention",
      ]),
    );
    expect(document?.facets.modelFamily).toBe("qwen");
    expect(document?.facets.sourceType).toBe("open-weights");
    expect(document?.facets.modalities).toEqual(["text", "image", "video"]);
    expect(document?.facets.trainingRegimeIds).toEqual([]);
  });

  test.each([
    ["Qwen3.5-0.8B", MODEL_URL],
    ["Qwen 3.5 0.8B", MODEL_URL],
    ["Qwen3.5 small model", MODEL_URL],
    ["Qwen3.5 multimodal model", MODEL_URL],
    ["Qwen multimodal small model", MODEL_URL],
    ["multimodal Qwen small", MODEL_URL],
    ["Qwen model family", MODEL_URL],
  ] as const)("search query %s resolves to %s", async (query, expectedUrl) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, expectedUrl)).toBe(true);
  });

  test.each([
    "model-family",
    "context-window",
    "attention",
    "foundations",
  ] as const)("tag browsing lists Qwen3.5-0.8B under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("model-family tag landing renders the Qwen3.5 page alongside Qwen3.6 entry points", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "model-family" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(`href="${MODEL_URL}"`);
    expect(html).toContain(`href="${DENSE_QWEN36_URL}"`);
    expect(html).toContain(`href="${MOE_QWEN36_URL}"`);
    expect(html).not.toContain("No resources");
  });

  test("reader prose gives next-step guidance for attention, context, multimodal, routing, and serving paths", async () => {
    expect(qwen35Messages.sections.importantModules.body).toContain(
      "Attention",
    );
    expect(qwen35Messages.sections.importantModules.body).toContain(
      "context-window",
    );
    expect(qwen35Messages.sections.importantModules.body).toContain(
      "multimodal-model",
    );
    expect(qwen35Messages.sections.importantModules.body).toContain("modality");
    expect(qwen35Messages.sections.importantModules.body).toContain(
      "inference-engine",
    );
    expect(qwen35Messages.sections.practicalNotes.body).toContain("Qwen3.6");
    expect(qwen35Messages.sections.practicalNotes.body).toContain("routing");
    expect(qwen35Messages.sections.practicalNotes.body).toContain(
      "mixture-of-experts",
    );

    const page = await loadModelPage("qwen3-5-0-8b");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain(`href="${DENSE_QWEN36_URL}"`);
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
  });
});
