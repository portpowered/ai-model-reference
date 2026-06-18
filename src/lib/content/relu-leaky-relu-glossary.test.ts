import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  LEAKY_RELU_GLOSSARY_PAGE_DIR,
  RELU_GLOSSARY_PAGE_DIR,
} from "@/lib/content/content-paths";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryPresentationConvergence,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const RELU_GLOSSARY_URL = "/docs/glossary/relu";
const LEAKY_RELU_GLOSSARY_URL = "/docs/glossary/leaky-relu";

const pageFixtures = [
  {
    registryId: "concept.relu",
    title: "ReLU",
    url: RELU_GLOSSARY_URL,
    pageDir: RELU_GLOSSARY_PAGE_DIR,
    aliases: ["ReLU", "rectified linear unit", "relu activation"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.leaky-relu",
    ],
    prose: "keeps the positive ones",
    comparisonTerm: "leakyrelu",
  },
  {
    registryId: "concept.leaky-relu",
    title: "LeakyReLU",
    url: LEAKY_RELU_GLOSSARY_URL,
    pageDir: LEAKY_RELU_GLOSSARY_PAGE_DIR,
    aliases: ["LeakyReLU", "leaky ReLU", "leaky rectified linear unit"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.relu",
    ],
    prose: "negative signal",
    comparisonTerm: "relu",
  },
] as const;

describe("FFN pages from phase 3 ReLU and LeakyReLU glossary pages (US-002)", () => {
  for (const fixture of pageFixtures) {
    test(`${fixture.title} registry record is published with aliases and curated related ids`, () => {
      const { registryId, aliases, relatedIds } = fixture;
      const record = getConceptById(registryId);
      expect(record?.status).toBe("published");
      expect(record?.aliases).toEqual([...aliases]);
      expect(record?.tags).toEqual(["foundations"]);
      expect(record?.relatedIds).toEqual([...relatedIds]);
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(registryId)).toBe(true);
    });

    test(`${fixture.title} curated related links activation, feed-forward network, standard FFN, and nearby variant`, () => {
      const { registryId, relatedIds } = fixture;
      const source = getConceptById(registryId);
      if (!source) {
        throw new Error(`expected ${registryId} in registry`);
      }

      const items = deriveCuratedRelatedItems(
        source,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      for (const relatedId of relatedIds) {
        const item = items.find(
          (candidate) => candidate.registryId === relatedId,
        );
        expect(item?.isPlanned).toBe(false);
      }

      expect(
        items.find((item) => item.registryId === "concept.activation")?.href,
      ).toBe("/docs/glossary/activation");
      expect(
        items.find((item) => item.registryId === "concept.feed-forward-network")
          ?.href,
      ).toBe("/docs/glossary/feed-forward-network");
      expect(
        items.find((item) => item.registryId === "concept.standard-ffn")?.href,
      ).toBe("/docs/glossary/standard-ffn");
    });
  }

  test("messages explain ReLU zeroing and LeakyReLU's small negative slope", () => {
    const reluMessages = pageMessagesSchema.parse(
      JSON.parse(
        readFileSync(join(RELU_GLOSSARY_PAGE_DIR, "messages/en.json"), "utf8"),
      ),
    );
    const leakyReluMessages = pageMessagesSchema.parse(
      JSON.parse(
        readFileSync(
          join(LEAKY_RELU_GLOSSARY_PAGE_DIR, "messages/en.json"),
          "utf8",
        ),
      ),
    );

    expect(reluMessages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "zero",
    );
    expect(reluMessages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "ffn",
    );
    expect(
      reluMessages.sections?.commonConfusions.body?.toLowerCase(),
    ).toContain("leakyrelu");

    expect(leakyReluMessages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "slope",
    );
    expect(
      leakyReluMessages.sections?.whyItMatters.body?.toLowerCase(),
    ).toContain("negative");
    expect(
      leakyReluMessages.sections?.commonConfusions.body?.toLowerCase(),
    ).toContain("swiglu");
  });

  for (const fixture of pageFixtures) {
    test(`${fixture.title} page renders required sections, tag pill, and FFN-family related links`, async () => {
      const { registryId, title, url, prose, comparisonTerm } = fixture;
      const slug = url.split("/").at(-1);
      if (!slug) {
        throw new Error(`missing slug for ${url}`);
      }

      const page = await loadGlossaryPage(slug);

      expect(page.frontmatter.kind).toBe("glossary");
      expect(page.frontmatter.status).toBe("published");
      expect(page.frontmatter.registryId).toBe(registryId);

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expectGlossaryPresentationConvergence(html, {
        title,
      });
      expect(html).toContain("What It Is");
      expect(html).toContain("Common Confusions");
      expectHtmlToContainProse(html, prose);
      expect(html).toContain('href="/docs/glossary/activation"');
      expect(html).toContain('href="/docs/glossary/feed-forward-network"');
      expect(html).toContain('href="/docs/glossary/standard-ffn"');
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="tag-pill-list"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html.toLowerCase()).toContain(comparisonTerm);
      expect(html).not.toContain("Phase");
      expect(html).not.toContain("Reader Shortcut");
    });
  }

  test("glossary browse index includes ReLU and LeakyReLU with summaries", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));

    const relu = entryByUrl.get(RELU_GLOSSARY_URL);
    expect(relu?.title).toBe("ReLU");
    expect(relu?.summary.length).toBeGreaterThan(0);

    const leakyRelu = entryByUrl.get(LEAKY_RELU_GLOSSARY_URL);
    expect(leakyRelu?.title).toBe("LeakyReLU");
    expect(leakyRelu?.summary.length).toBeGreaterThan(0);
  });

  test("search documents and canonical queries resolve to the ReLU-family pages", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const relu = documents.find((entry) => entry.url === RELU_GLOSSARY_URL);
    expect(relu?.kind).toBe("glossary");
    expect(relu?.aliases).toEqual(
      expect.arrayContaining(["ReLU", "rectified linear unit"]),
    );

    const leakyRelu = documents.find(
      (entry) => entry.url === LEAKY_RELU_GLOSSARY_URL,
    );
    expect(leakyRelu?.kind).toBe("glossary");
    expect(leakyRelu?.aliases).toEqual(
      expect.arrayContaining(["LeakyReLU", "leaky ReLU"]),
    );

    const reluResults = await docsSearchApi.search("ReLU");
    expect(pageBaseUrl(reluResults[0]?.url ?? "")).toBe(RELU_GLOSSARY_URL);

    const leakyReluResults = await docsSearchApi.search("LeakyReLU");
    expect(pageBaseUrl(leakyReluResults[0]?.url ?? "")).toBe(
      LEAKY_RELU_GLOSSARY_URL,
    );
  });
});
