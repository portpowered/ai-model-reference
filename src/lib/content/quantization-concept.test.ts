import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

describe("Phase 5 quantization overview concept page (chapter-5-quantization-001)", () => {
  test("registry record is published with quantization-specific aliases, citations, and curated related ids", () => {
    const record = getConceptById("concept.quantization");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.conceptType).toBe("inference");
    expect(record?.aliases).toEqual([
      "model quantization",
      "low-bit inference",
      "low precision inference",
    ]);
    expect(record?.tags).toEqual(["quantization"]);
    expect(record?.citationIds).toEqual([
      "citation.quantization-integer-only-inference",
      "citation.qlora",
      "citation.kivi-kv-cache-quantization",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.weight-only-quantization",
      "concept.activation-quantization",
      "concept.kv-cache-quantization",
      "concept.post-training-quantization",
      "concept.calibration",
      "concept.quantization-aware-training",
      "concept.dynamic-quantization",
      "concept.why-4-bit-models-are-not-exactly-4x-faster",
      "concept.parameter",
      "concept.activation",
      "concept.autoregressive-generation",
      "module.multi-query-attention",
      "module.grouped-query-attention",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.quantization")).toBe(true);
  });

  test("curated related links point to parameter, activation, autoregressive generation, MQA, and GQA", () => {
    const source = getConceptById("concept.quantization");
    if (!source) {
      throw new Error("expected concept.quantization in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.parameter")?.href,
    ).toBe("/docs/glossary/parameter");
    expect(
      items.find((item) => item.registryId === "concept.activation")?.href,
    ).toBe("/docs/concepts/activation");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "module.multi-query-attention")
        ?.href,
    ).toBe("/docs/modules/multi-query-attention");
    expect(
      items.find((item) => item.registryId === "module.grouped-query-attention")
        ?.href,
    ).toBe("/docs/modules/grouped-query-attention");
  });

  test("page renders route, chapter search handoffs, and nearby related links", async () => {
    const page = await loadConceptPage("quantization");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.quantization");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain("fewer bits");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("memory bandwidth");
    expect(html).toContain("dequantization");
    expect(html).toContain('href="/docs/concepts/weight-only-quantization"');
    expect(html).toContain('href="/docs/concepts/activation-quantization"');
    expect(html).toContain('href="/docs/concepts/kv-cache-quantization"');
    expect(html).toContain('href="/docs/concepts/post-training-quantization"');
    expect(html).toContain('href="/docs/concepts/calibration"');
    expect(html).toContain('href="/docs/concepts/quantization-aware-training"');
    expect(html).toContain('href="/docs/concepts/dynamic-quantization"');
    expect(html).toContain(
      'href="/docs/concepts/why-4-bit-models-are-not-exactly-4x-faster"',
    );
    expect(html).toContain('href="/docs/glossary/parameter"');
    expect(html).toContain('href="/docs/concepts/activation"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/tags/quantization"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("benchmark leaderboard");
  });

  test("search documents and live search surface quantization by title, alias, and core body terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === "/docs/concepts/quantization",
    );

    expect(document?.kind).toBe("concept");
    expect(document?.facets.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["model quantization", "low-bit inference"]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["quantization"]));
    expect(document?.bodyText).toContain("KV cache");

    const titleResults = await docsSearchApi.search("quantization");
    expect(titleResults[0]?.url).toBe("/docs/concepts/quantization");

    const aliasResults = await docsSearchApi.search("model quantization");
    expect(
      aliasResults.some(
        (result) => result.url === "/docs/concepts/quantization",
      ),
    ).toBe(true);

    const bodyResults = await docsSearchApi.search("low precision inference");
    expect(
      bodyResults.some(
        (result) => result.url === "/docs/concepts/quantization",
      ),
    ).toBe(true);
  });

  test("quantization tag surfaces the overview page", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("quantization", messages, "en");
    const conceptGroup = groups.find((group) => group.kind === "concept");

    expect(conceptGroup?.resources.map((resource) => resource.url)).toContain(
      "/docs/concepts/quantization",
    );

    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "quantization" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Quantization");
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/search?tag=quantization"');
  });

  test("existing parameter, autoregressive generation, and grouped-query attention pages link back to quantization", async () => {
    const parameterPage = await loadGlossaryPage("parameter");
    const parameterHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: parameterPage.messages,
        assets: parameterPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: parameterPage.content,
      }),
    );
    expect(parameterHtml).toContain('href="/docs/concepts/quantization"');

    const generationPage = await loadGlossaryPage("autoregressive-generation");
    const generationHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: generationPage.messages,
        assets: generationPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: generationPage.content,
      }),
    );
    expect(generationHtml).toContain('href="/docs/concepts/quantization"');

    const gqaPage = await loadModulePage("grouped-query-attention");
    const gqaHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: gqaPage.messages,
        assets: gqaPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: gqaPage.content,
      }),
    );
    expect(gqaHtml).toContain('href="/docs/concepts/quantization"');
  });
});
