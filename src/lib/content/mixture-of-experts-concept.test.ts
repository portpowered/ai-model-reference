import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

describe("Mixture of experts concept page", () => {
  test("loads the canonical concept page with message-driven sections and nearby MoE links", async () => {
    const page = await loadConceptPage("mixture-of-experts");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.mixture-of-experts");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Mixture of Experts");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("sparse");
    expect(page.messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "feed-forward slot",
    );
    expect(page.messages.sections?.tradeoffs.body?.toLowerCase()).toContain(
      "load-balancing",
    );
    expect(page.assets).toEqual({});

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
    expect(html).toContain("How Sparse Routing Changes Scaling");
    expect(html).toContain("Tradeoffs");
    expect(html).toContain("top-k");
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/modules/mixture-of-experts"');
    expect(html).toContain('href="/docs/modules/deepseekmoe"');
    expect(html).toContain('href="/docs/models/deepseek-v4-pro"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("benchmark");
  });

  test("keeps the route, English messages, registry record, search document, and curated related links aligned", async () => {
    const registryRecord = getConceptById("concept.mixture-of-experts");
    expect(registryRecord?.status).toBe("published");
    expect(registryRecord?.kind).toBe("concept");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.mixture-of-experts")).toBe(
      true,
    );

    if (!registryRecord) {
      throw new Error("expected concept.mixture-of-experts in registry");
    }

    const page = await loadConceptPage("mixture-of-experts");
    expect(page.frontmatter.registryId).toBe("concept.mixture-of-experts");
    expect(page.messages.title).toBe("Mixture of Experts");
    expect(page.messages.description).toContain("sparse");

    const relatedItems = deriveCuratedRelatedItems(
      registryRecord,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems.find(
        (item) => item.registryId === "module.mixture-of-experts",
      )?.href,
    ).toBe("/docs/modules/mixture-of-experts");
    expect(
      relatedItems.find((item) => item.registryId === "module.deepseekmoe")
        ?.href,
    ).toBe("/docs/modules/deepseekmoe");
    expect(
      relatedItems.find((item) => item.registryId === "model.deepseek-v4-pro")
        ?.href,
    ).toBe("/docs/models/deepseek-v4-pro");

    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const route = pages.find(
      (entry) => entry.frontmatter.registryId === "concept.mixture-of-experts",
    );
    expect(route?.url).toBe("/docs/concepts/mixture-of-experts");
    expect(route?.messages.title).toBe(page.messages.title);

    const searchDocuments = buildSearchDocuments(pages, registry);
    const document = searchDocuments.find(
      (entry) => entry.url === "/docs/concepts/mixture-of-experts",
    );

    expect(document?.kind).toBe("concept");
    expect(document?.facets.kind).toBe("concept");
    expect(document?.registryId).toBe("concept.mixture-of-experts");
    expect(document?.title).toBe(page.messages.title);
    expect(document?.description).toBe(page.messages.description);
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["MoE", "expert routing"]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["feed-forward", "foundations"]),
    );

    const searchResults = await docsSearchApi.search("mixture of experts");
    expect(searchResults[0]?.url).toBe("/docs/concepts/mixture-of-experts");
  });
});
