/**
 * Consolidated review-facing slice proof for the throughput-vs-latency glossary page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and related-link behavior together.
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
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

setDefaultTimeout(15_000);

const REGISTRY_ID = "concept.throughput-vs-latency";
const PAGE_URL = "/docs/glossary/throughput-vs-latency";
const pageDir = getDocsPageDir("glossary", "throughput-vs-latency");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderThroughputVsLatencyPageHtml(): Promise<string> {
  const page = await loadGlossaryPage("throughput-vs-latency");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("throughput vs latency slice verification (throughput-vs-latency-serving-metric-page-004)", () => {
  test("published route, registry record, bundled messages, and citations stay aligned", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "throughput-vs-latency",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
    });
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("throughput-vs-latency");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(bundledAssets).toEqual({});
    expect(bundledMessages.relatedDocs).toBeDefined();

    const resolved = resolveCitations(record?.citationIds ?? []);
    expect(resolved.map((citation) => citation.id)).toEqual([
      "citation.orca-serving-system",
      "citation.brown-gpt-3",
    ]);
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "glossary",
      "throughput-vs-latency",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Throughput");

    const rendered = await renderDocsSlugPage(
      ["glossary", "throughput-vs-latency"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes serving neighbors, related reasons, and search aliases", async () => {
    const html = await renderThroughputVsLatencyPageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.throughput-vs-latency in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/time-to-first-token"');
    expect(html).toContain('href="/docs/glossary/inter-token-latency"');
    expect(html).toContain('href="/docs/glossary/tokens-per-second"');
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/concepts/prefill-decode-split"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/continuous-batching"');
    expect(html).toContain('href="/docs/systems/dynamic-batching"');
    expect(html).toContain('href="/docs/systems/request-scheduling"');
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/docs/systems/deployment"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html.toLowerCase()).toContain(
      "aggregate output rate, which is the throughput side of the tradeoff",
    );
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(related.length).toBeGreaterThan(0);

    for (const query of [
      "throughput vs latency",
      "latency throughput tradeoff",
      "serving throughput",
      "concurrency latency tradeoff",
      "throughput-latency tradeoff",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }

    const tradeoffResults = await docsSearchApi.search("throughput vs latency");
    expect(tradeoffResults[0]?.url).toBe(PAGE_URL);
  });
});
