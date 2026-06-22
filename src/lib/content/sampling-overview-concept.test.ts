import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { SAMPLING_OVERVIEW_CONCEPT_PAGE_DIR } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = SAMPLING_OVERVIEW_CONCEPT_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("sampling overview concept page (sampling-overview-concept-page-002)", () => {
  test("registry record stays published and now resolves in the canonical concept section", () => {
    const record = getConceptById("concept.sampling-overview");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "sampling overview",
      "token sampling",
      "next-token sampling",
      "sampling basics",
      "decoding strategy",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.temperature",
      "concept.softmax",
      "concept.autoregressive-generation",
      "concept.decode",
      "concept.greedy-decoding",
      "concept.top-k-sampling",
      "concept.top-p-sampling",
      "paper.gpt-2-report",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.sampling-overview")).toBe(
      true,
    );
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.sampling-overview"),
    ).toBe(true);
  });

  test("curated related links resolve to the generation path, sampling methods, and nearby GPT-family context", () => {
    const source = getConceptById("concept.sampling-overview");
    if (!source) {
      throw new Error("expected concept.sampling-overview in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.some(
        (item) =>
          item.registryId === "concept.temperature" &&
          item.href === "/docs/glossary/temperature",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.autoregressive-generation" &&
          item.href === "/docs/glossary/autoregressive-generation",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.decode" &&
          item.href === "/docs/glossary/decode",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.greedy-decoding" &&
          item.href === "/docs/glossary/greedy-decoding",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.top-k-sampling" &&
          item.href === "/docs/glossary/top-k-sampling",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.top-p-sampling" &&
          item.href === "/docs/glossary/top-p-sampling",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "paper.gpt-2-report" &&
          item.href === "/docs/papers/gpt-2-report",
      ),
    ).toBe(true);
  });

  test("messages teach the post-probability decision step and distinguish overview from deeper controls", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Sampling Overview");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "final next-token decision step",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "probabilities",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "repeatable",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "diversity",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "underlying knowledge",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "temperature",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "greedy decoding",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "top-k sampling",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "top-p sampling",
    );
  });

  test("page renders the canonical concept route with generation-path links and no hard-coded summary block", async () => {
    const page = await loadConceptPage("sampling-overview");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.sampling-overview");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.toc.some((item) => item.url === "#reader-path")).toBe(true);

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
    expect(html).toContain("Where To Go Next");
    expect(html).toContain("Common Confusions");
    expect(html).toContain(
      "These settings change the selection process, not the model&#x27;s underlying knowledge",
    );
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/greedy-decoding"');
    expect(html).toContain('href="/docs/glossary/top-k-sampling"');
    expect(html).toContain('href="/docs/glossary/top-p-sampling"');
    expect(html).toContain('href="/docs/papers/gpt-2-report"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Phase");
  });

  test("published pages and search documents expose the canonical concept route alongside the existing glossary entry", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    expect(
      pages.some((page) => page.docsSlug === "concepts/sampling-overview"),
    ).toBe(true);
    expect(
      pages.some((page) => page.docsSlug === "glossary/sampling-overview"),
    ).toBe(true);

    const conceptDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/sampling-overview",
    );
    expect(conceptDocument?.kind).toBe("concept");
    expect(conceptDocument?.facets.kind).toBe("concept");
    expect(conceptDocument?.aliases).toEqual(
      expect.arrayContaining([
        "sampling overview",
        "token sampling",
        "next-token sampling",
        "sampling basics",
        "decoding strategy",
      ]),
    );
    expect(conceptDocument?.tags).toEqual(
      expect.arrayContaining(["foundations", "token-to-probability-chain"]),
    );
  });

  test("search returns the canonical concept route for title and sampling-basics queries", async () => {
    for (const query of [
      "Sampling Overview",
      "sampling basics",
      "token sampling",
      "next-token sampling",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some(
          (result) => result.url === "/docs/concepts/sampling-overview",
        ),
      ).toBe(true);
    }
  });
});
