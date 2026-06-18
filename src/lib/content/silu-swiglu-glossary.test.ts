import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  SILU_GLOSSARY_PAGE_DIR,
  SWIGLU_GLOSSARY_PAGE_DIR,
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

const SILU_GLOSSARY_URL = "/docs/glossary/silu";
const SWIGLU_GLOSSARY_URL = "/docs/glossary/swiglu";

const pageFixtures = [
  {
    registryId: "concept.silu",
    title: "SiLU",
    url: SILU_GLOSSARY_URL,
    pageDir: SILU_GLOSSARY_PAGE_DIR,
    aliases: ["SiLU", "sigmoid linear unit", "swish"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.swiglu",
    ],
    prose: "soft gate",
    comparisonTerm: "swiglu",
  },
  {
    registryId: "concept.swiglu",
    title: "SwiGLU",
    url: SWIGLU_GLOSSARY_URL,
    pageDir: SWIGLU_GLOSSARY_PAGE_DIR,
    aliases: ["SwiGLU", "Swi GLU", "Swish GLU", "swish gated linear unit"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.silu",
      "concept.mixture-of-experts",
    ],
    prose: "two hidden branches",
    comparisonTerm: "mixture-of-experts",
  },
] as const;

describe("FFN pages from phase 3 SiLU and SwiGLU glossary pages (US-003)", () => {
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

    test(`${fixture.title} curated related links connect FFN foundations and nearby variants`, () => {
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

  test("messages explain SiLU's smooth gate and SwiGLU's gated FFN structure", () => {
    const siluMessages = pageMessagesSchema.parse(
      JSON.parse(
        readFileSync(join(SILU_GLOSSARY_PAGE_DIR, "messages/en.json"), "utf8"),
      ),
    );
    const swigluMessages = pageMessagesSchema.parse(
      JSON.parse(
        readFileSync(
          join(SWIGLU_GLOSSARY_PAGE_DIR, "messages/en.json"),
          "utf8",
        ),
      ),
    );

    expect(siluMessages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "smooth",
    );
    expect(siluMessages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "ffn",
    );
    expect(
      siluMessages.sections?.commonConfusions.body?.toLowerCase(),
    ).toContain("swiglu");

    expect(swigluMessages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "two hidden branches",
    );
    expect(swigluMessages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "standard ffn",
    );
    expect(
      swigluMessages.sections?.commonConfusions.body?.toLowerCase(),
    ).toContain("mixture-of-experts");
    expect(
      swigluMessages.sections?.commonConfusions.body?.toLowerCase(),
    ).toContain("silu");
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

  test("glossary browse index includes SiLU and SwiGLU with summaries", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));

    const silu = entryByUrl.get(SILU_GLOSSARY_URL);
    expect(silu?.title).toBe("SiLU");
    expect(silu?.summary.length).toBeGreaterThan(0);

    const swiglu = entryByUrl.get(SWIGLU_GLOSSARY_URL);
    expect(swiglu?.title).toBe("SwiGLU");
    expect(swiglu?.summary.length).toBeGreaterThan(0);
  });

  test("search documents and canonical queries resolve to the SiLU-family pages", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const silu = documents.find((entry) => entry.url === SILU_GLOSSARY_URL);
    expect(silu?.kind).toBe("glossary");
    expect(silu?.aliases).toEqual(
      expect.arrayContaining(["SiLU", "sigmoid linear unit", "swish"]),
    );

    const swiglu = documents.find((entry) => entry.url === SWIGLU_GLOSSARY_URL);
    expect(swiglu?.kind).toBe("glossary");
    expect(swiglu?.aliases).toEqual(
      expect.arrayContaining(["SwiGLU", "Swi GLU", "Swish GLU"]),
    );

    const siluResults = await docsSearchApi.search("SiLU");
    expect(pageBaseUrl(siluResults[0]?.url ?? "")).toBe(SILU_GLOSSARY_URL);

    const swigluResults = await docsSearchApi.search("SwiGLU");
    expect(pageBaseUrl(swigluResults[0]?.url ?? "")).toBe(SWIGLU_GLOSSARY_URL);
  });
});
