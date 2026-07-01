/**
 * Consolidated review-facing slice proof for the tokens-per-second glossary page.
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

const REGISTRY_ID = "concept.tokens-per-second";
const PAGE_URL = "/docs/glossary/tokens-per-second";
const pageDir = getDocsPageDir("glossary", "tokens-per-second");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

const EXPECTED_CURATED_RELATED = [
  {
    registryId: "concept.time-to-first-token",
    href: "/docs/glossary/time-to-first-token",
  },
  {
    registryId: "concept.prefill",
    href: "/docs/concepts/prefill",
  },
  {
    registryId: "concept.decode",
    href: "/docs/glossary/decode",
  },
  {
    registryId: "concept.kv-cache",
    href: "/docs/concepts/kv-cache",
  },
  {
    registryId: "concept.prefill-decode-split",
    href: "/docs/glossary/prefill-decode-split",
  },
  {
    registryId: "system.batching",
    href: "/docs/systems/batching",
  },
  {
    registryId: "system.continuous-batching",
    href: "/docs/systems/continuous-batching",
  },
  {
    registryId: "system.dynamic-batching",
    href: "/docs/systems/dynamic-batching",
  },
  {
    registryId: "system.request-scheduling",
    href: "/docs/systems/request-scheduling",
  },
  {
    registryId: "system.memory",
    href: "/docs/systems/memory",
  },
  {
    registryId: "system.deployment",
    href: "/docs/systems/deployment",
  },
  {
    registryId: "system.inference-engine",
    href: "/docs/systems/inference-engine",
  },
] as const;

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

describe("tokens per second slice verification (tokens-per-second-serving-metric-page-004)", () => {
  test("published route, registry record, bundled messages, assets, and citations stay aligned", async () => {
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
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(bundledAssets.streamingTimeline?.graphId).toBe(
      "graph.tokens-per-second-streaming-timeline",
    );

    const resolved = resolveCitations(record?.citationIds ?? []);
    expect(resolved.map((citation) => citation.id)).toEqual([
      "citation.orca-serving-system",
      "citation.brown-gpt-3",
    ]);
  });

  test("curated related links resolve to published serving foundation pages only", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.tokens-per-second in registry");
    }

    const items = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const expected of EXPECTED_CURATED_RELATED) {
      expect(
        items.some(
          (item) =>
            item.registryId === expected.registryId &&
            item.href === expected.href,
        ),
      ).toBe(true);
    }

    expect(
      items.some((item) => item.registryId.includes("inter-token-latency")),
    ).toBe(false);
  });

  test("rendered page exposes citations, serving foundations, search aliases, and glossary discovery", async () => {
    const html = await renderTokensPerSecondPageHtml();

    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    for (const expected of EXPECTED_CURATED_RELATED) {
      expect(html).toContain(`href="${expected.href}"`);
    }
    expect(html).not.toContain("placeholder");
    expect(html).toContain(
      "https://www.usenix.org/conference/osdi22/presentation/yu",
    );
    expect(html).toContain("https://arxiv.org/abs/2005.14165");

    for (const query of [
      "tokens per second",
      "tok/s",
      "output tokens per second",
      "generation rate",
      "throughput",
      "streaming speed",
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
        (node) => node.type === "page" && node.name === "Tokens Per Second",
      ),
    ).toBe(true);
  });
});
