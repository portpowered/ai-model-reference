/**
 * Consolidated review-facing slice proof for the tokens per second glossary page.
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
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
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

const REGISTRY_ID = "concept.tokens-per-second";
const PAGE_URL = "/docs/glossary/tokens-per-second";
const pageDir = getDocsPageDir("glossary", "tokens-per-second");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderTokensPerSecondPageHtml(): Promise<string> {
  const page = await loadGlossaryPage("tokens-per-second");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("tokens per second slice verification (tokens-per-second-glossary-page-005)", () => {
  test("published route, registry record, bundled messages, and citations stay aligned", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "tokens-per-second",
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
    expect(record?.slug).toBe("tokens-per-second");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "tokens per second",
        "tokens/s",
        "tok/s",
        "TPS",
        "throughput",
        "generation throughput",
      ]),
    );
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(bundledMessages.openingSummary).toMatch(
      /^Tokens per second \(tokens\/s/,
    );
    expect(bundledAssets).toEqual({});
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);

    const resolved = resolveCitations(record?.citationIds ?? []);
    expect(resolved.map((citation) => citation.id)).toEqual([
      "citation.orca-serving-system",
      "citation.brown-gpt-3",
    ]);
  });

  test("rendered page exposes throughput teaching, metric distinctions, citations, serving links, and search aliases", async () => {
    const html = await renderTokensPerSecondPageHtml();
    const page = await loadGlossaryPage("tokens-per-second");
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.tokens-per-second in registry");
    }

    const related = applyRelatedDocMessageOverrides(
      deriveCuratedRelatedItems(
        record,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ),
      page.messages,
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expectGlossaryOmitsOpeningSummary(html);
    expectGlossarySingleTagPillList(html);
    expectHtmlToContainProse(html, "Tokens per second");
    expectHtmlToContainProse(html, "tokenizer");
    expectHtmlToContainProse(html, "total request latency");
    expectHtmlToContainProse(html, "time to first token");
    expectHtmlToContainProse(html, "inter-token latency");
    expectHtmlToContainProse(html, "larger batch");
    expectHtmlToContainProse(html, "memory bandwidth");
    expectHtmlToContainProse(html, "execution policy");
    expectHtmlToContainProse(html, "batching tradeoffs");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('id="metric-comparison"');
    expect(html).toContain('id="what-affects-throughput"');
    expect(html).toContain('id="serving-path"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/continuous-batching"');
    expect(html).toContain('href="/docs/systems/request-scheduling"');
    expect(html).toContain('href="/docs/glossary/inter-token-latency"');
    expect(html).toContain('href="/docs/glossary/time-to-first-token"');
    expect(html).not.toContain("roofline");
    expect(html).not.toContain("Reader Shortcut");
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((item) => Boolean(item.reasonLabel?.length))).toBe(
      true,
    );

    for (const query of [
      "tokens per second",
      "tokens/s",
      "tok/s",
      "TPS",
      "throughput",
      "generation throughput",
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
        (node) => node.type === "page" && node.name === "Tokens Per Second",
      ),
    ).toBe(true);
  });
});
