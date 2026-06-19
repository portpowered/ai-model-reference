import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { FEED_FORWARD_NETWORK_CONCEPT_PAGE_DIR } from "@/lib/content/content-paths";
import { expectHtmlToContainProse } from "@/lib/content/glossary-test-helpers";
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

const pageDir = FEED_FORWARD_NETWORK_CONCEPT_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Feed-forward network concept page (feed-forward-network-concept-page-001)", () => {
  test("registry record is published and now resolves as a concept page", () => {
    const record = getConceptById("concept.feed-forward-network");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "FFN",
      "feedforward network",
      "MLP block",
    ]);
    expect(record?.tags).toEqual(["feed-forward", "foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "concept.standard-ffn",
      "concept.mixture-of-experts",
      "concept.activation",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.feed-forward-network"),
    ).toBe(true);
  });

  test("curated related links keep nearby transformer and FFN-family docs navigable", () => {
    const source = getConceptById("concept.feed-forward-network");
    if (!source) {
      throw new Error("expected concept.feed-forward-network in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const architecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(architecture?.href).toBe("/docs/concepts/transformer-architecture");
    expect(architecture?.isPlanned).toBe(false);

    const standardFfn = items.find(
      (item) => item.registryId === "concept.standard-ffn",
    );
    expect(standardFfn?.href).toBe("/docs/modules/standard-ffn");
    expect(standardFfn?.isPlanned).toBe(false);

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

  test("messages explain why transformers need the FFN in addition to attention", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Feed-Forward Network");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "attention",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "attention",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "nonlinear",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "mixture-of-experts",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "swiglu",
    );
  });

  test("page renders the concept-template route and sections without raw title duplication", async () => {
    const page = await loadConceptPage("feed-forward-network");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.feed-forward-network");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).not.toContain(`<h1>${page.messages.title}</h1>`);
    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Simple Example");
    expect(html).toContain("Common Confusions");
    expectHtmlToContainProse(html, "post-attention slot");
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/modules/mixture-of-experts"');
    expect(html).toContain('href="/docs/glossary/activation"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Phase");
  });

  test("search index records the canonical concept route", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/concepts/feed-forward-network",
    );
    expect(document?.kind).toBe("concept");
    expect(document?.facets.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["FFN", "feedforward network", "MLP block"]),
    );
  });
});
