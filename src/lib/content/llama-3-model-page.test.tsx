import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  getContentRoot,
  getModelsDocsRoot,
  getRegistryRoot,
} from "@/lib/content/content-paths";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { validateGeneratedPageBundle } from "@/lib/content/validate-generated-page-bundle";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

const LLAMA_3_SLUG = "llama-3";
const LLAMA_3_URL = "/docs/models/llama-3";

const REPRESENTATIVE_SEARCH_QUERIES = [
  "Llama 3",
  "Meta Llama",
  "405B",
  "128K context",
  "open weight transformer",
];

const RELATED_DOC_HREFS = [
  "/docs/concepts/transformer-architecture",
  "/docs/glossary/autoregressive-generation",
  "/docs/glossary/decoder",
  "/docs/modules/attention",
  "/docs/modules/rope",
  "/docs/training/pretraining",
  "/docs/concepts/alignment",
  "/docs/glossary/context-window",
] as const;

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("llama-3 model page", () => {
  test("published docs registry resolves the canonical llama-3 route", () => {
    expect(PUBLISHED_DOCS_REGISTRY_IDS).toContain("model.llama-3");

    const entry = getPublishedDocsEntryByRegistryId("model.llama-3");
    expect(entry?.url).toBe(LLAMA_3_URL);
    expect(entry?.slug).toBe(LLAMA_3_SLUG);
  });

  test("registry record matches the published page frontmatter contract", () => {
    const record = getModelById("model.llama-3");
    expect(record?.slug).toBe(LLAMA_3_SLUG);
    expect(record?.status).toBe("published");
    expect(record?.aliases).toContain("Meta Llama");
    expect(record?.aliases).toContain("128K context");
    expect(record?.aliases).toContain("open weight transformer");
  });

  test("route, registry record, English bundle, and search document resolve together", async () => {
    expect(source.getPage(["models", LLAMA_3_SLUG])).toBeDefined();

    const modelsDocsRoot = getModelsDocsRoot();
    const pageDirectory = join(modelsDocsRoot, LLAMA_3_SLUG);
    const registryRoot = getRegistryRoot();
    const indexes = await loadRegistry({ registryRoot });

    const errors = await validateGeneratedPageBundle({
      registryRoot,
      docsRoot: join(getContentRoot(), "docs"),
      pageDirectory,
      registryPath: join(registryRoot, "models", `${LLAMA_3_SLUG}.json`),
      pageUrl: LLAMA_3_URL,
      indexes,
    });

    expect(errors).toEqual([]);

    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, indexes);
    const document = documents.find((entry) => entry.url === LLAMA_3_URL);

    expect(document?.kind).toBe("model");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Llama 3",
        "Meta Llama",
        "405B",
        "128K context",
        "open weight transformer",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["model-family", "attention", "context-window"]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.transformer-architecture",
        "concept.autoregressive-generation",
        "module.rope",
        "training-regime.pretraining",
        "concept.alignment",
      ]),
    );
  });

  test.each(
    REPRESENTATIVE_SEARCH_QUERIES,
  )("search ranks the canonical llama-3 page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(LLAMA_3_URL);
  });

  test("curated related docs connect transformer, attention, RoPE, context, and training paths", () => {
    const model = getModelById("model.llama-3");
    if (!model) {
      throw new Error("expected model.llama-3 in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      model,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const href of RELATED_DOC_HREFS) {
      expect(items.some((item) => item.href === href && !item.isPlanned)).toBe(
        true,
      );
    }
  });

  test("derived related docs and tag areas surface discovery links on the page", async () => {
    const relatedHtml = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.llama-3"
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );

    for (const href of RELATED_DOC_HREFS) {
      expect(relatedHtml).toContain(`href="${href}"`);
    }

    const page = await loadModelPage(LLAMA_3_SLUG);
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
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/context-window"');
    for (const href of RELATED_DOC_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  test("page renders core explainer sections and registry-backed metadata", async () => {
    const page = await loadModelPage(LLAMA_3_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(page.frontmatter.registryId).toBe("model.llama-3");
    expect(page.messages.openingSummary).toContain("decoder-only transformer");
    expect(html).toContain("What It Is");
    expect(html).toContain("Inputs And Outputs");
    expect(html).toContain("Architecture");
    expect(html).toContain("Important Modules");
    expect(html).toContain("Training");
    expect(html).toContain("Practical Notes");
    expect(html).toContain("405 billion parameters");
    expect(html).toContain("128K");
    expect(html).toContain("131,072 tokens");
    expect(html).toContain("autoregressive");
    expect(html).toContain("benchmark leaderboard");
    expect(html).toContain("Rotary position");
    expect(html).toContain("grouped-query attention");
    expect(html).toContain("Pretraining");
    expect(html).toContain("post-training");
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/rope"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain("Llama 3");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('href="https://arxiv.org/abs/2407.21783"');
    expect(html).toContain('href="https://llama.meta.com"');
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain('data-graph-id="graph.llama-3-architecture"');
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("RoPE");
    expect(html).toContain("SwiGLU");
  });
});
