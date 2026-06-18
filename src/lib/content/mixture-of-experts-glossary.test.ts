import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { MIXTURE_OF_EXPERTS_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = MIXTURE_OF_EXPERTS_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 mixture of experts glossary page (US-003)", () => {
  test("registry record is published with aliases, tags, and curated related ids", () => {
    const record = getConceptById("concept.mixture-of-experts");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "MoE",
      "mixture-of-experts layer",
      "sparse MoE",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "concept.transformer-architecture",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.mixture-of-experts")).toBe(
      true,
    );
  });

  test("curated related links feed-forward network, standard FFN, and transformer architecture", () => {
    const source = getConceptById("concept.mixture-of-experts");
    if (!source) {
      throw new Error("expected concept.mixture-of-experts in registry");
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

    const standardFfn = items.find(
      (item) => item.registryId === "concept.standard-ffn",
    );
    expect(standardFfn?.href).toBe("/docs/modules/standard-ffn");
    expect(standardFfn?.isPlanned).toBe(false);

    const architecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(architecture?.href).toBe("/docs/concepts/transformer-architecture");
    expect(architecture?.isPlanned).toBe(false);
  });

  test("messages explain expert routing, top-k activation, and capacity tradeoffs", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Mixture of experts");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("router");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("top-k");
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "capacity",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "ensemble",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "dense ffn",
    );
  });

  test("page renders MoE summary, common confusions, and FFN-family related links", async () => {
    const page = await loadGlossaryPage("mixture-of-experts");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.mixture-of-experts");

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
    expectHtmlToContainProse(html, "gating network");
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records mixture of experts with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/modules/mixture-of-experts",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
  });
});
