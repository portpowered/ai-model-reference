import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { expectHtmlToContainProse } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
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
import { docsSearchApi } from "@/lib/search/search-server";

const ACTIVATION_FAMILY_TIMEOUT_MS = 15_000;

const PAGE_CASES = [
  {
    slug: "sigmoid",
    registryId: "concept.sigmoid",
    title: "Sigmoid Activation",
    pageDir: getDocsPageDir("modules", "sigmoid"),
    pageKind: "module",
    usesModuleTemplate: true,
    expectedTags: ["activation", "foundations"],
    aliases: ["logistic activation", "logistic sigmoid", "sigmoid function"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.relu",
      "concept.silu",
    ],
    hrefs: [
      "/docs/concepts/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/silu",
    ],
    curatedHrefs: [
      "/docs/concepts/activation",
      "/docs/concepts/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/silu",
    ],
    messageNeedles: ["smooth", "saturat", "0-to-1"],
    renderNeedle: "maps each input value",
    searchQuery: "sigmoid",
    searchQueries: ["sigmoid", "logistic activation", "activation"],
    searchUrl: "/docs/modules/sigmoid",
  },
  {
    slug: "tanh",
    registryId: "concept.tanh",
    title: "Hyperbolic Tangent Activation",
    pageDir: getDocsPageDir("modules", "tanh"),
    pageKind: "module",
    usesModuleTemplate: true,
    expectedTags: ["activation", "foundations"],
    aliases: ["tanh", "hyperbolic tangent", "tanh activation"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.sigmoid",
      "concept.relu",
    ],
    hrefs: [
      "/docs/concepts/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/sigmoid",
      "/docs/modules/relu",
    ],
    curatedHrefs: [
      "/docs/concepts/activation",
      "/docs/concepts/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/sigmoid",
      "/docs/modules/relu",
    ],
    messageNeedles: ["centered", "saturat", "-1 and 1"],
    renderNeedle: "centered range lets a hidden value",
    searchQuery: "tanh",
    searchQueries: ["tanh", "hyperbolic tangent", "activation"],
    searchUrl: "/docs/modules/tanh",
  },
  {
    slug: "gelu",
    registryId: "concept.gelu",
    title: "Gaussian Error Linear Unit",
    pageDir: getDocsPageDir("modules", "gelu"),
    pageKind: "module",
    usesModuleTemplate: true,
    expectedTags: ["activation", "foundations"],
    aliases: ["gelu", "Gaussian Error Linear Unit", "transformer activation"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.relu",
      "concept.silu",
      "concept.swiglu",
    ],
    hrefs: [
      "/docs/concepts/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/silu",
      "/docs/modules/swiglu",
    ],
    curatedHrefs: [
      "/docs/concepts/activation",
      "/docs/concepts/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/silu",
      "/docs/modules/swiglu",
    ],
    messageNeedles: ["smooth", "transformer", "negative values"],
    renderNeedle: "Gaussian Error Linear Unit",
    searchQuery: "GELU",
    searchQueries: [
      "gelu",
      "Gaussian Error Linear Unit",
      "transformer activation",
      "activation",
    ],
    searchUrl: "/docs/modules/gelu",
  },
  {
    slug: "relu",
    registryId: "concept.relu",
    title: "Rectified Linear Unit",
    pageDir: getDocsPageDir("modules", "relu"),
    pageKind: "module",
    usesModuleTemplate: true,
    expectedTags: ["activation", "foundations"],
    aliases: ["rectified linear unit", "ReLU activation", "rectifier"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.leaky-relu",
      "concept.silu",
    ],
    hrefs: [
      "/docs/concepts/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/leaky-relu",
      "/docs/modules/silu",
    ],
    curatedHrefs: [
      "/docs/concepts/activation",
      "/docs/concepts/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/leaky-relu",
      "/docs/modules/silu",
    ],
    messageNeedles: ["positive", "zero", "negative evidence"],
    renderNeedle: "keep positive numbers",
    searchQuery: "ReLU",
    searchUrl: "/docs/modules/relu",
  },
  {
    slug: "leaky-relu",
    registryId: "concept.leaky-relu",
    title: "Leaky Rectified Linear Unit",
    pageDir: getDocsPageDir("modules", "leaky-relu"),
    pageKind: "module",
    usesModuleTemplate: true,
    expectedTags: ["activation", "foundations"],
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
      "/docs/concepts/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/silu",
    ],
    curatedHrefs: [
      "/docs/concepts/activation",
      "/docs/concepts/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/silu",
    ],
    messageNeedles: ["small constant", "negative", "weak negative signal"],
    renderNeedle: "small constant such as 0.01",
    searchQuery: "LeakyReLU",
    searchUrl: "/docs/modules/leaky-relu",
  },
  {
    slug: "silu",
    registryId: "concept.silu",
    title: "Sigmoid Linear Unit",
    pageDir: getDocsPageDir("modules", "silu"),
    pageKind: "module",
    usesModuleTemplate: true,
    expectedTags: ["activation", "foundations"],
    aliases: ["sigmoid linear unit", "Swish", "SiLU activation"],
    relatedIds: [
      "concept.activation",
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.relu",
      "concept.swiglu",
    ],
    hrefs: [
      "/docs/concepts/activation",
      "/docs/modules/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/swiglu",
    ],
    curatedHrefs: [
      "/docs/concepts/activation",
      "/docs/concepts/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/modules/relu",
      "/docs/modules/swiglu",
    ],
    messageNeedles: ["sigmoid", "smooth", "swiglu"],
    renderNeedle: "sigmoid linear unit",
    searchQuery: "SiLU",
    searchUrl: "/docs/modules/silu",
  },
  {
    slug: "swiglu",
    registryId: "concept.swiglu",
    title: "Swish Gated Linear Unit",
    pageDir: getDocsPageDir("modules", "swiglu"),
    pageKind: "module",
    usesModuleTemplate: true,
    expectedTags: ["feed-forward", "foundations"],
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
      "/docs/concepts/activation",
    ],
    curatedHrefs: [
      "/docs/concepts/feed-forward-network",
      "/docs/modules/standard-ffn",
      "/docs/concepts/mixture-of-experts",
      "/docs/modules/silu",
      "/docs/concepts/activation",
    ],
    messageNeedles: ["gate", "silu", "mixture of experts"],
    renderNeedle: "input state enters two learned projections",
    searchQuery: "SwiGLU",
    expectedGraphId: "graph.swiglu-compute-flow",
    searchUrl: "/docs/modules/swiglu",
  },
] as const satisfies ReadonlyArray<{
  slug: string;
  registryId: string;
  title: string;
  pageDir: string;
  pageKind: "glossary" | "module";
  usesModuleTemplate: boolean;
  expectedTags: readonly string[];
  aliases: readonly string[];
  relatedIds: readonly string[];
  hrefs: readonly string[];
  curatedHrefs?: readonly string[];
  messageNeedles: readonly string[];
  renderNeedle: string;
  searchQuery: string;
  searchQueries?: readonly string[];
  searchUrl: string;
  expectedGraphId?: string;
}>;

describe("Phase 3 activation-family glossary pages", () => {
  for (const testCase of PAGE_CASES) {
    test(`${testCase.title} registry record is published with aliases, tags, and curated related ids`, () => {
      const record = getConceptById(testCase.registryId);
      expect(record?.status).toBe("published");
      expect(record?.aliases).toEqual([...testCase.aliases]);
      expect(record?.tags).toEqual([...testCase.expectedTags]);
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

      const expectedHrefs = testCase.curatedHrefs ?? testCase.hrefs;

      for (const href of expectedHrefs) {
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
        messages.sections?.whyItExists.body,
        messages.sections?.comparedToNearbyModules.body,
        messages.sections?.limitationsAndTradeoffs.body,
      ].join(" ");
      const normalizedBody = combinedBody.toLowerCase();

      for (const needle of testCase.messageNeedles) {
        expect(normalizedBody).toContain(needle);
      }
    });

    test(
      `${testCase.title} page renders glossary sections, tags, and FFN-family links`,
      async () => {
        const page = await loadModulePage(testCase.slug);

        expect(page.frontmatter.kind).toBe(testCase.pageKind);
        expect(page.frontmatter.status).toBe("published");
        expect(page.frontmatter.registryId).toBe(`module.${testCase.slug}`);

        const html = renderToStaticMarkup(
          createElement(ModulePageProviders, {
            messages: page.messages,
            assets: page.assets,
            // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
            children: page.content,
          }),
        );

        expect(html).not.toContain(`<h1>${testCase.title}</h1>`);
        expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(
          1,
        );
        expect(html).toContain("What It Is");
        expect(html).toContain("Why It Exists");
        expect(html).toContain("Compared To Nearby Modules");
        expect(html).toContain("Why It Still Matters");
        expect(html).toContain(`data-registry-id="module.${testCase.slug}"`);
        expect(html).toContain('data-page-asset="comparisonTable"');
        expect(html).toContain('data-attention-schema-comparison="true"');
        expectHtmlToContainProse(html, testCase.renderNeedle);
        if ("expectedGraphId" in testCase) {
          expect(html).toContain('data-react-flow-graph="true"');
          expect(html).toContain('data-attention-variant-comparison="true"');
          expect(html).toContain(`data-graph-id="${testCase.expectedGraphId}"`);
        } else {
          expect(
            html.includes('data-activation-chart="true"') ||
              html.includes('data-attention-variant-comparison="true"'),
          ).toBe(true);
        }
        for (const href of testCase.hrefs) {
          expect(html).toContain(`href="${href}"`);
        }
        expect(html).toContain('href="/tags/foundations"');
        expect(html).toContain('data-testid="tag-pill-list"');
        expect(html).toContain('data-testid="curated-related-docs"');
        expect(html).not.toContain("Phase");
        expect(html).not.toContain("Reader Shortcut");
      },
      { timeout: ACTIVATION_FAMILY_TIMEOUT_MS },
    );

    test(
      `${testCase.title} search index records the glossary page and preserves aliases`,
      async () => {
        const registry = await loadRegistry();
        const pages = await loadPublishedDocsPages("en");
        const documents = buildSearchDocuments(pages, registry);

        const document = documents.find(
          (entry) => entry.url === testCase.searchUrl,
        );
        expect(document?.title).toBe(testCase.title);
        expect(document?.kind).toBe(testCase.pageKind);
        expect(document?.facets.kind).toBe(testCase.pageKind);
        expect(document?.aliases).toEqual(
          expect.arrayContaining(testCase.aliases),
        );
        expect(document?.bodyText.length ?? 0).toBeGreaterThan(50);
        expect(document?.headings.length ?? 0).toBeGreaterThan(0);
        expect(testCase.searchQuery.length).toBeGreaterThan(0);
      },
      { timeout: ACTIVATION_FAMILY_TIMEOUT_MS },
    );

    if ("searchQueries" in testCase) {
      test(
        `${testCase.title} search queries return the published module page`,
        async () => {
          for (const query of testCase.searchQueries) {
            const results = await docsSearchApi.search(query);
            expect(
              results.some((result) => result.url === testCase.searchUrl),
            ).toBe(true);
          }
        },
        { timeout: ACTIVATION_FAMILY_TIMEOUT_MS },
      );
    }
  }
});
