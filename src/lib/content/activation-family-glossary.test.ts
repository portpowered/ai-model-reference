import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  LEAKY_RELU_GLOSSARY_PAGE_DIR,
  RELU_GLOSSARY_PAGE_DIR,
  SILU_GLOSSARY_PAGE_DIR,
  SWIGLU_GLOSSARY_PAGE_DIR,
} from "@/lib/content/content-paths";
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

const PAGE_CASES = [
  {
    slug: "relu",
    registryId: "concept.relu",
    title: "ReLU",
    pageDir: RELU_GLOSSARY_PAGE_DIR,
    aliases: ["rectified linear unit", "ReLU activation", "rectifier"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.leaky-relu",
      "concept.silu",
    ],
    hrefs: [
      "/docs/glossary/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/leaky-relu",
      "/docs/modules/silu",
    ],
    messageNeedles: ["positive", "zero", "attention"],
    renderNeedle: "keep positive numbers",
    searchQuery: "ReLU",
  },
  {
    slug: "leaky-relu",
    registryId: "concept.leaky-relu",
    title: "LeakyReLU",
    pageDir: LEAKY_RELU_GLOSSARY_PAGE_DIR,
    aliases: [
      "leaky ReLU",
      "leaky rectified linear unit",
      "Leaky ReLU activation",
    ],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.relu",
      "concept.silu",
    ],
    hrefs: [
      "/docs/glossary/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/silu",
    ],
    messageNeedles: ["small constant", "negative", "standard ffn"],
    renderNeedle: "small constant such as 0.01",
    searchQuery: "LeakyReLU",
  },
  {
    slug: "silu",
    registryId: "concept.silu",
    title: "SiLU",
    pageDir: SILU_GLOSSARY_PAGE_DIR,
    aliases: ["sigmoid linear unit", "Swish", "SiLU activation"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.relu",
      "concept.swiglu",
    ],
    hrefs: [
      "/docs/glossary/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/swiglu",
    ],
    messageNeedles: ["sigmoid", "smooth", "swiglu"],
    renderNeedle: "sigmoid linear unit",
    searchQuery: "SiLU",
  },
  {
    slug: "swiglu",
    registryId: "concept.swiglu",
    title: "SwiGLU",
    pageDir: SWIGLU_GLOSSARY_PAGE_DIR,
    aliases: ["swish gated linear unit", "SiLU-gated FFN", "SwiGLU FFN"],
    relatedIds: [
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.mixture-of-experts",
      "concept.silu",
      "concept.activation",
    ],
    hrefs: [
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/mixture-of-experts",
      "/docs/modules/silu",
      "/docs/glossary/activation",
    ],
    messageNeedles: ["gate", "silu", "mixture of experts"],
    renderNeedle: "two branches after attention",
    searchQuery: "SwiGLU",
    expectedGraphId: "graph.swiglu-compute-flow",
  },
] as const;

describe("Phase 3 activation-family glossary pages (US-002)", () => {
  for (const testCase of PAGE_CASES) {
    test(`${testCase.title} registry record is published with aliases, tags, and curated related ids`, () => {
      const record = getConceptById(testCase.registryId);
      expect(record?.status).toBe("published");
      expect(record?.aliases).toEqual([...testCase.aliases]);
      expect(record?.tags).toEqual(["foundations"]);
      expect(record?.relatedIds).toEqual([...testCase.relatedIds]);
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(testCase.registryId)).toBe(true);
    });

    test(`${testCase.title} curated related links resolve to published FFN-family pages`, () => {
      const source = getConceptById(testCase.registryId);
      if (!source) {
        throw new Error(`expected ${testCase.registryId} in registry`);
      }

      const items = deriveCuratedRelatedItems(
        source,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      for (const href of testCase.hrefs) {
        expect(
          items.some((item) => item.href === href && !item.isPlanned),
        ).toBe(true);
      }
    });

    test(`${testCase.title} messages explain the intended FFN behavior in plain language`, () => {
      const messages = pageMessagesSchema.parse(
        JSON.parse(
          readFileSync(join(testCase.pageDir, "messages/en.json"), "utf8"),
        ),
      );

      expect(messages.title).toBe(testCase.title);
      expect(messages.openingSummary?.length).toBeGreaterThan(0);
      const combinedBody = [
        messages.sections?.whatItIs.body,
        messages.sections?.whyItMatters.body,
        messages.sections?.commonConfusions.body,
      ]
        .join(" ")
        .toLowerCase();

      for (const needle of testCase.messageNeedles) {
        expect(combinedBody).toContain(needle);
      }
    });

    test(`${testCase.title} page renders glossary sections, tags, and FFN-family links`, async () => {
      const page = await loadGlossaryPage(testCase.slug);

      expect(page.frontmatter.kind).toBe("glossary");
      expect(page.frontmatter.status).toBe("published");
      expect(page.frontmatter.registryId).toBe(testCase.registryId);

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expectGlossaryPresentationConvergence(html, {
        title: testCase.title,
      });
      expect(html).toContain("What It Is");
      expect(html).toContain("Common Confusions");
      expectHtmlToContainProse(html, testCase.renderNeedle);
      if ("expectedGraphId" in testCase) {
        expect(html).toContain('data-react-flow-graph="true"');
        expect(html).toContain(`data-graph-id="${testCase.expectedGraphId}"`);
      }
      for (const href of testCase.hrefs) {
        expect(html).toContain(`href="${href}"`);
      }
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="tag-pill-list"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).not.toContain("Phase");
      expect(html).not.toContain("Reader Shortcut");
    });

    test(`${testCase.title} search index records the glossary page and preserves aliases`, async () => {
      const registry = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");
      const documents = buildSearchDocuments(pages, registry);

      const document = documents.find(
        (entry) => entry.url === `/docs/glossary/${testCase.slug}`,
      );
      expect(document?.title).toBe(testCase.title);
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
      expect(document?.aliases).toEqual(
        expect.arrayContaining(testCase.aliases),
      );
      expect(document?.bodyText.length ?? 0).toBeGreaterThan(50);
      expect(document?.headings.length ?? 0).toBeGreaterThan(0);
      expect(testCase.searchQuery.length).toBeGreaterThan(0);
    });
  }
});
