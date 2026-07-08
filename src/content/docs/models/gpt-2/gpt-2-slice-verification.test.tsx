/**
 * Consolidated review-facing slice proof for the GPT-2 model page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, architecture graph, search, citation, and discovery behavior.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { resolveCitations } from "@/lib/content/citations";
import { getModelsDocsRoot } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModelPage } from "@/lib/content/model-page";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const MODEL_SLUG = "gpt-2";
const MODEL_ID = "model.gpt-2";
const MODEL_URL = "/docs/models/gpt-2";
const GRAPH_ID = "graph.gpt-2-architecture";
const GPT2_REPORT_URL = "/docs/papers/gpt-2-report";
const repoRoot = join(import.meta.dir, "../../../../..");

const EXPECTED_CITATION_URL =
  "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf";

const SEARCH_QUERIES = [
  "GPT-2",
  "Generative Pre-trained Transformer 2",
  "decoder-only transformer GPT",
] as const;

const pageDir = join(getModelsDocsRoot(), MODEL_SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

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

async function renderModelPageHtml(): Promise<string> {
  const page = await loadModelPage(MODEL_SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("GPT-2 slice verification (gpt-2-model-page-current-main-005)", () => {
  test("canonical route resolves to a published model page with registry record, English messages, local assets, and graph wiring", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const entry = getPublishedDocsEntryByRegistryId(MODEL_ID);
    const model = getModelById(MODEL_ID);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(entry).toMatchObject({
      registryId: MODEL_ID,
      slug: MODEL_SLUG,
      url: MODEL_URL,
    });
    expect(model?.status).toBe("published");
    expect(model?.family).toBe("gpt");
    expect(page.frontmatter.registryId).toBe(MODEL_ID);
    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.title).toBe("GPT-2");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      altKey: "assets.architectureGraph.alt",
    });
    expect(JSON.parse(readFileSync(assetsPath, "utf8"))).toMatchObject({
      architectureGraph: {
        graphId: GRAPH_ID,
      },
    });
  });

  test("page-local assets and citations resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const model = getModelById(MODEL_ID);

    if (!model) {
      throw new Error("expected GPT-2 model record in registry");
    }

    expect(assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      altKey: "assets.architectureGraph.alt",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(messages.assets?.architectureGraph?.alt).toContain(
      "next-token sampling",
    );
    expect(model.citationIds).toEqual(["citation.gpt-2-report"]);

    const citations = resolveCitations(model.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.url).toBe(EXPECTED_CITATION_URL);
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["models", MODEL_SLUG]);
    expect(metadata.alternates).toEqual({
      canonical: MODEL_URL,
      languages: {
        en: MODEL_URL,
      },
    });
    expect(metadata.title).toContain("GPT-2");

    const rendered = await renderDocsSlugPage(["models", MODEL_SLUG], "en");
    expect(rendered).toBeDefined();
  });

  test("architecture graph asset resolves to a graph record and renders through the model architecture graph surface", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const graph = getGraphById(GRAPH_ID);

    expect(graph).toBeDefined();
    expect(graph?.subjectId).toBe(MODEL_ID);
    expect(page.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
    });

    const html = await renderModelPageHtml();
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain(page.messages.assets?.architectureGraph?.alt ?? "");
    expect(html).toContain("Next Token");
    expect(html).toContain("Logits");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain("missing asset");
  });

  test("rendered page exposes title, sections, tags, related docs, citations, and references without unresolved localized content", async () => {
    const html = await renderModelPageHtml();

    expect(html).toContain("GPT-2");
    expect(html).toContain("decoder-only");
    expect(html).toContain('data-registry-id="model.gpt-2"');
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Training");
    expect(html).toContain("Practical Notes");
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain(`href="${EXPECTED_CITATION_URL}"`);
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("Draft placeholder");
  });

  test.each(SEARCH_QUERIES)(
    "search query %s resolves to the canonical GPT-2 page",
    async (query) => {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
    },
  );

  test("related-doc traversal exposes transformer architecture, tokenization, sampling, and GPT-2 report discovery paths", () => {
    const relatedHtml = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: MODEL_ID,
        groups: ["curated-related", "shared-modules", "shared-training-regimes"],
      }),
    );

    expect(relatedHtml).toContain('data-related-group="curated-related"');
    expect(relatedHtml).toContain(
      'href="/docs/concepts/transformer-architecture"',
    );
    expect(relatedHtml).toContain(
      'href="/docs/modules/byte-level-tokenization"',
    );
    expect(relatedHtml).toContain('href="/docs/glossary/sampling-overview"');
    expect(relatedHtml).toContain(`href="${GPT2_REPORT_URL}"`);
  });

  test("served GPT-2 page renders title, sections, graph, tags, and references without errors", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    const browser = await launchPlaywrightBrowser();

    try {
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 375, height: 667 },
      ]) {
        const page = await browser.newPage({ viewport });
        page.setDefaultTimeout(30_000);
        await page.goto(`${session.baseUrl}${MODEL_URL}`, {
          waitUntil: "load",
        });

        await page
          .getByRole("heading", { name: "GPT-2", exact: true })
          .waitFor({ state: "visible" });

        for (const sectionTitle of [
          "What It Is",
          "Architecture",
          "Training",
          "References",
        ]) {
          await page
            .getByRole("heading", { name: sectionTitle })
            .first()
            .waitFor({ state: "visible" });
        }

        const graph = page.locator('[data-react-flow-graph="true"]');
        await graph.waitFor({ state: "visible" });
        expect(await graph.getAttribute("data-graph-id")).toBe(GRAPH_ID);

        await page
          .locator('[data-testid="tag-pill-list"]')
          .first()
          .waitFor({ state: "visible" });

        await page
          .locator('[data-testid="citation-list"]')
          .first()
          .waitFor({ state: "visible" });

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
