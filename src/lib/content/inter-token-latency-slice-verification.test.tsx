/**
 * Consolidated review-facing slice proof for the inter-token latency glossary page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * citation resolution, rendering, search, and related-link behavior together.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
import {
  applyRelatedDocMessageOverrides,
  deriveCuratedRelatedItems,
} from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

const REGISTRY_ID = "concept.inter-token-latency";
const PAGE_URL = "/docs/glossary/inter-token-latency";
const pageDir = getDocsPageDir("glossary", "inter-token-latency");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

const NEARBY_SERVING_REGISTRY_IDS = [
  "concept.time-to-first-token",
  "concept.prefill",
  "concept.decode",
  "concept.kv-cache",
  "concept.prefill-decode-split",
  "system.batching",
  "system.continuous-batching",
  "system.dynamic-batching",
  "system.request-scheduling",
  "system.memory",
  "system.deployment",
  "system.inference-engine",
] as const;

const NEARBY_SERVING_HREFS = [
  "/docs/glossary/time-to-first-token",
  "/docs/concepts/prefill",
  "/docs/glossary/decode",
  "/docs/concepts/kv-cache",
  "/docs/glossary/prefill-decode-split",
  "/docs/systems/batching",
  "/docs/systems/continuous-batching",
  "/docs/systems/dynamic-batching",
  "/docs/systems/request-scheduling",
  "/docs/systems/memory",
  "/docs/systems/deployment",
  "/docs/systems/inference-engine",
] as const;

async function renderInterTokenLatencyPageHtml(): Promise<string> {
  const page = await loadGlossaryPage("inter-token-latency");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("inter-token latency slice verification (inter-token-latency-serving-metric-page-004)", () => {
  test("published route, registry record, bundled messages, and citations stay aligned", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "inter-token-latency",
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
    expect(record?.slug).toBe("inter-token-latency");
    expect(record?.relatedIds).toEqual([...NEARBY_SERVING_REGISTRY_IDS]);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(bundledAssets).toMatchObject({
      metricComparison: {
        type: "table",
        tableId: "table.inter-token-latency-metric-comparison",
      },
    });

    const resolved = resolveCitations(record?.citationIds ?? []);
    expect(resolved.map((citation) => citation.id)).toEqual([
      "citation.orca-serving-system",
      "citation.brown-gpt-3",
    ]);
  });

  test("messages define layperson relationship explanations for nearby serving pages", async () => {
    const page = await loadGlossaryPage("inter-token-latency");

    for (const registryId of NEARBY_SERVING_REGISTRY_IDS) {
      expect(page.messages.relatedDocs?.[registryId]?.reason).toBeTruthy();
    }
  });

  test("rendered page exposes citations, metric comparison, serving foundations, and search aliases", async () => {
    const html = await renderInterTokenLatencyPageHtml();
    const page = await loadGlossaryPage("inter-token-latency");
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.inter-token-latency in registry");
    }

    const related = applyRelatedDocMessageOverrides(
      deriveCuratedRelatedItems(
        record,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ),
      page.messages,
    );

    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain(
      'data-table-id="table.inter-token-latency-metric-comparison"',
    );
    expect(html).toContain('id="serving-path"');

    for (const href of NEARBY_SERVING_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(related).toHaveLength(NEARBY_SERVING_REGISTRY_IDS.length);
    for (const registryId of NEARBY_SERVING_REGISTRY_IDS) {
      const item = related.find((entry) => entry.registryId === registryId);
      expect(item?.href).toBeTruthy();
      expect(item?.reasonLabel).toBe(
        page.messages.relatedDocs?.[registryId]?.reason,
      );
    }

    for (const query of [
      "inter-token latency",
      "per-token latency",
      "streaming latency",
      "token cadence",
      "decode latency",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }

    const glossaryFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Glossary",
    );
    expect(glossaryFolder?.type).toBe("folder");
    if (glossaryFolder?.type !== "folder") {
      throw new Error("expected Glossary folder in docs sidebar");
    }

    const glossaryUrls = glossaryFolder.children
      .filter(
        (
          node,
        ): node is Extract<
          (typeof glossaryFolder.children)[number],
          { type: "page" }
        > => node.type === "page",
      )
      .map((node) => node.url);
    expect(glossaryUrls).toContain(PAGE_URL);
    expect(
      glossaryFolder.children.some(
        (node) => node.type === "page" && node.name === "Inter-Token Latency",
      ),
    ).toBe(true);
  });
});
