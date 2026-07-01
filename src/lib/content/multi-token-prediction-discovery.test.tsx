import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const MULTI_TOKEN_PREDICTION_URL = "/docs/modules/multi-token-prediction";

describe("multi-token prediction discovery surfaces (multi-token-prediction-004)", () => {
  test("search documents carry canonical discovery phrases and citation-backed aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === MULTI_TOKEN_PREDICTION_URL,
    );

    expect(document).toBeDefined();
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "multi-token prediction",
        "multitoken prediction",
        "MTP",
        "N-token prediction",
        "multiple future tokens",
        "predict multiple future tokens",
        "2404.19737",
        "Better & Faster Large Language Models via Multi-token Prediction",
      ]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["foundations"]));
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "training-regime.pretraining",
        "concept.autoregressive-generation",
        "system.speculative-decoding",
        "concept.decoder",
        "concept.transformer-architecture",
      ]),
    );
  });

  test.each([
    "multi-token prediction",
    "multitoken prediction",
    "MTP",
    "predict multiple future tokens",
    "2404.19737",
  ] as const)("live search routes %s to the canonical multi-token prediction page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MULTI_TOKEN_PREDICTION_URL);
  });

  test("foundations tag browsing includes the published module under Module groups", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("foundations", messages, "en");
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup).toBeDefined();
    expect(
      moduleGroup?.resources.some(
        (resource) => resource.url === MULTI_TOKEN_PREDICTION_URL,
      ),
    ).toBe(true);
  });

  test("rendered page shell exposes summary, graph, tags, citations, and related docs without placeholders", async () => {
    const page = await loadModulePage("multi-token-prediction");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Multi-Token Prediction");
    expect(html).toContain("At a glance");
    expect(html).toContain(
      'data-graph-id="graph.multi-token-prediction-mtp-comparison"',
    );
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('href="https://arxiv.org/abs/2404.19737"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/systems/speculative-decoding"');
    expect(html).toContain('href="/docs/glossary/decoder"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).not.toContain("TODO");
    expect(html).not.toContain("__MISSING");
  });
});
