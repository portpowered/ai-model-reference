import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { STANDARD_FFN_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = STANDARD_FFN_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 standard FFN glossary page (US-001)", () => {
  test("registry record is published with aliases, tags, and curated related ids", () => {
    const record = getConceptById("concept.standard-ffn");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "dense FFN",
      "dense MLP block",
      "standard feed-forward network",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.feed-forward-network",
      "concept.mixture-of-experts",
      "concept.activation",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.standard-ffn")).toBe(true);
  });

  test("curated related links feed-forward network, mixture of experts, and activation", () => {
    const source = getConceptById("concept.standard-ffn");
    if (!source) {
      throw new Error("expected concept.standard-ffn in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const feedForward = items.find(
      (item) => item.registryId === "concept.feed-forward-network",
    );
    expect(feedForward?.href).toBe("/docs/modules/feed-forward-network");
    expect(feedForward?.isPlanned).toBe(false);

    const moe = items.find(
      (item) => item.registryId === "concept.mixture-of-experts",
    );
    expect(moe?.href).toBe("/docs/modules/mixture-of-experts");
    expect(moe?.isPlanned).toBe(false);

    const activation = items.find(
      (item) => item.registryId === "concept.activation",
    );
    expect(activation?.href).toBe("/docs/glossary/activation");
    expect(activation?.isPlanned).toBe(false);
  });

  test("messages explain dense expand-activate-project baseline and contrast nearby variants", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Standard FFN");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "attention",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("dense");
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "expand",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "mixture of experts",
    );
  });

  test("page renders glossary sections, tags, and nearby FFN-family links", async () => {
    const page = await loadGlossaryPage("standard-ffn");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.standard-ffn");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryPresentationConvergence(html, {
      title: page.messages.title,
    });
    expect(html).toContain("What It Is");
    expect(html).toContain("Common Confusions");
    expectHtmlToContainProse(html, "expand, activate, project");
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
    expect(html).toContain('href="/docs/modules/mixture-of-experts"');
    expect(html).toContain('href="/docs/glossary/activation"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records standard FFN with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/modules/standard-ffn",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["dense FFN", "standard feed-forward network"]),
    );
  });
});
