/**
 * Consolidated review-facing slice proof for the flow matching concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, graph, and related-link behavior together.
 */
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.flow-matching";
const PAGE_URL = "/docs/concepts/flow-matching";
const VECTOR_FIELD_GRAPH_ID = "graph.flow-matching-vector-field-flow";
const pageDir = getDocsPageDir("concepts", "flow-matching");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

setDefaultTimeout(15_000);

async function renderFlowMatchingPageHtml(): Promise<string> {
  const page = await loadConceptPage("flow-matching");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("flow matching slice verification (flow-matching-concept-page-006)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "flow-matching",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("flow-matching");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets.vectorFieldFlow?.graphId).toBe(VECTOR_FIELD_GRAPH_ID);
  });

  test("registry citation references resolve for flow matching objective claims", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.flow-matching in registry");
    }

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(2);
    expect(citations.map((citation) => citation.id)).toEqual(
      expect.arrayContaining([
        "citation.flow-matching-for-generative-modeling",
        "citation.rectified-flow",
      ]),
    );
    expect(citations.every((citation) => citation.url.length > 0)).toBe(true);
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["concepts", "flow-matching"]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Flow matching");

    const rendered = await renderDocsSlugPage(
      ["concepts", "flow-matching"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes sections, graph, tags, adjacent links, citations, and related docs", async () => {
    const html = await renderFlowMatchingPageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.flow-matching in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(html).toContain("Flow matching");
    expect(html).toContain("generative training objective");
    expect(html).toContain("Vector Field Intuition");
    expect(html).toContain("Compared To Diffusion-Style Generation");
    expect(html).toContain("In Modern Image And Video Systems");
    expect(html).toContain(`data-graph-id="${VECTOR_FIELD_GRAPH_ID}"`);
    expect(html).toContain("data-page-math-variable-definitions");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain(
      'href="/docs/training/diffusion-training-objective"',
    );
    expect(html).toContain('href="/docs/papers/latent-diffusion"');
    expect(html).toContain('href="/docs/modules/diffusion-transformer-block"');
    expect(html).toContain('href="/docs/models/ltx-23"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).not.toContain('href="/docs/concepts/cosmos"');
    expect(html).not.toContain('href="/docs/concepts/video-generation"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(html).not.toContain("missing-content");
    expect(related.length).toBeGreaterThan(0);
  });

  test("search aliases route discovery queries to the canonical flow matching page", async () => {
    for (const query of [
      "flow matching",
      "rectified flow",
      "velocity prediction",
      "diffusion vs flow matching",
      "flow matching video generation",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
