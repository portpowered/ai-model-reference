/**
 * Consolidated review-facing slice proof for the TTFT glossary page.
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
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

const REGISTRY_ID = "concept.time-to-first-token";
const PAGE_URL = "/docs/glossary/time-to-first-token";
const pageDir = getDocsPageDir("glossary", "time-to-first-token");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderTtftPageHtml(): Promise<string> {
  const page = await loadGlossaryPage("time-to-first-token");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("time to first token slice verification (time-to-first-token-serving-metric-page-004)", () => {
  test("published route, registry record, bundled messages, and citations stay aligned", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "time-to-first-token",
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
    expect(record?.slug).toBe("time-to-first-token");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(bundledAssets).toEqual({});

    const resolved = resolveCitations(record?.citationIds ?? []);
    expect(resolved.map((citation) => citation.id)).toEqual([
      "citation.orca-serving-system",
      "citation.brown-gpt-3",
    ]);
  });

  test("rendered page exposes citations, serving foundations, and search aliases", async () => {
    const html = await renderTtftPageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.time-to-first-token in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/systems/continuous-batching"');
    expect(html).not.toContain('href="/docs/systems/dynamic-batching"');
    expect(html).not.toContain('href="/docs/systems/request-scheduling"');
    expect(related.length).toBeGreaterThan(0);

    for (const query of [
      "TTFT",
      "time to first token",
      "first token latency",
      "serving latency",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }

    const inferenceFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Inference",
    );
    expect(inferenceFolder?.type).toBe("folder");
    if (inferenceFolder?.type !== "folder") {
      throw new Error("expected Inference folder in docs sidebar");
    }

    const inferenceUrls = inferenceFolder.children
      .filter(
        (
          node,
        ): node is Extract<
          (typeof inferenceFolder.children)[number],
          { type: "page" }
        > => node.type === "page",
      )
      .map((node) => node.url);
    expect(inferenceUrls).toContain(PAGE_URL);
    expect(
      inferenceFolder.children.some(
        (node) => node.type === "page" && node.name === "Time To First Token",
      ),
    ).toBe(true);
  });
});
