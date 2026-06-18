import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  BATCH_NORM_GLOSSARY_PAGE_DIR,
  GROUP_NORM_GLOSSARY_PAGE_DIR,
  QK_NORM_GLOSSARY_PAGE_DIR,
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
    slug: "batch-norm",
    registryId: "concept.batch-norm",
    title: "Batch norm",
    pageDir: BATCH_NORM_GLOSSARY_PAGE_DIR,
    aliases: ["BatchNorm", "batch normalization", "BN"],
    relatedIds: [
      "concept.normalization",
      "concept.group-norm",
      "concept.layer-norm",
    ],
    hrefs: [
      "/docs/glossary/normalization",
      "/docs/glossary/group-norm",
      "/docs/glossary/layer-norm",
    ],
    messageNeedles: ["minibatch", "convolutional", "layer norm"],
    renderNeedle: "batch neighbors",
  },
  {
    slug: "group-norm",
    registryId: "concept.group-norm",
    title: "Group norm",
    pageDir: GROUP_NORM_GLOSSARY_PAGE_DIR,
    aliases: ["GroupNorm", "group normalization", "GN"],
    relatedIds: [
      "concept.normalization",
      "concept.batch-norm",
      "concept.layer-norm",
    ],
    hrefs: [
      "/docs/glossary/normalization",
      "/docs/glossary/batch-norm",
      "/docs/glossary/layer-norm",
    ],
    messageNeedles: ["groups", "small or irregular", "vision models"],
    renderNeedle: "64 channels",
  },
  {
    slug: "qk-norm",
    registryId: "concept.qk-norm",
    title: "QK norm",
    pageDir: QK_NORM_GLOSSARY_PAGE_DIR,
    aliases: ["QK norm", "query-key normalization", "QK normalization"],
    relatedIds: [
      "concept.normalization",
      "concept.layer-norm",
      "concept.rmsnorm",
    ],
    hrefs: [
      "/docs/glossary/normalization",
      "/docs/glossary/layer-norm",
      "/docs/glossary/rmsnorm",
    ],
    messageNeedles: ["query", "key", "attention"],
    renderNeedle: "softmax",
  },
] as const;

describe("Phase 3 normalization-variant glossary pages (US-004)", () => {
  test("normalization overview explains the added variant family", () => {
    const record = getConceptById("concept.normalization");
    expect(record?.explainsIds).toEqual([
      "concept.layer-norm",
      "concept.rmsnorm",
      "concept.batch-norm",
      "concept.group-norm",
      "concept.qk-norm",
    ]);
  });

  for (const testCase of PAGE_CASES) {
    test(`${testCase.title} registry record is published with aliases, tags, and curated related ids`, () => {
      const record = getConceptById(testCase.registryId);
      expect(record?.status).toBe("published");
      expect(record?.aliases).toEqual([...testCase.aliases]);
      expect(record?.tags).toEqual(["foundations"]);
      expect(record?.prerequisiteIds).toEqual(["concept.normalization"]);
      expect(record?.relatedIds).toEqual([...testCase.relatedIds]);
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(testCase.registryId)).toBe(true);
    });

    test(`${testCase.title} curated related links resolve to nearby normalization pages`, () => {
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

    test(`${testCase.title} messages explain scope, placement, and comparison points`, () => {
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

    test(`${testCase.title} page renders glossary sections, tags, and related normalization links`, async () => {
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
    });
  }
});
