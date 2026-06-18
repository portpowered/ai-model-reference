import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { FEED_FORWARD_NETWORK_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = FEED_FORWARD_NETWORK_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 feed-forward network glossary page (US-002)", () => {
  test("registry record is published with aliases, tags, and curated related ids", () => {
    const record = getConceptById("concept.feed-forward-network");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "FFN",
      "feedforward network",
      "MLP block",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "concept.activation",
      "concept.standard-ffn",
      "concept.relu",
      "concept.leaky-relu",
      "concept.silu",
      "concept.swiglu",
      "concept.mixture-of-experts",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.feed-forward-network"),
    ).toBe(true);
  });

  test("curated related links connect the broad FFN overview to architecture and nearby family variants", () => {
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
    expect(standardFfn?.href).toBe("/docs/glossary/standard-ffn");
    expect(standardFfn?.isPlanned).toBe(false);

    const activation = items.find(
      (item) => item.registryId === "concept.activation",
    );
    expect(activation?.href).toBe("/docs/glossary/activation");
    expect(activation?.isPlanned).toBe(false);

    const relu = items.find((item) => item.registryId === "concept.relu");
    expect(relu?.href).toBe("/docs/glossary/relu");
    expect(relu?.isPlanned).toBe(false);

    const leakyRelu = items.find(
      (item) => item.registryId === "concept.leaky-relu",
    );
    expect(leakyRelu?.href).toBe("/docs/glossary/leaky-relu");
    expect(leakyRelu?.isPlanned).toBe(false);

    const silu = items.find((item) => item.registryId === "concept.silu");
    expect(silu?.href).toBe("/docs/glossary/silu");
    expect(silu?.isPlanned).toBe(false);

    const swiglu = items.find((item) => item.registryId === "concept.swiglu");
    expect(swiglu?.href).toBe("/docs/glossary/swiglu");
    expect(swiglu?.isPlanned).toBe(false);

    const moe = items.find(
      (item) => item.registryId === "concept.mixture-of-experts",
    );
    expect(moe?.href).toBe("/docs/glossary/mixture-of-experts");
    expect(moe?.isPlanned).toBe(false);
  });

  test("messages describe per-position FFN role after attention", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Feed-forward network");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "attention",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "position",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "attention",
    );
  });

  test("page renders glossary sections, tag pills, and FFN family related links", async () => {
    const page = await loadGlossaryPage("feed-forward-network");

    expect(page.frontmatter.kind).toBe("glossary");
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

    expectGlossaryPresentationConvergence(html, {
      title: page.messages.title,
    });
    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expectHtmlToContainProse(html, "two-layer perceptron");
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/glossary/activation"');
    expect(html).toContain('href="/docs/glossary/standard-ffn"');
    expect(html).toContain('href="/docs/glossary/relu"');
    expect(html).toContain('href="/docs/glossary/leaky-relu"');
    expect(html).toContain('href="/docs/glossary/silu"');
    expect(html).toContain('href="/docs/glossary/swiglu"');
    expect(html).toContain('href="/docs/glossary/mixture-of-experts"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records feed-forward network with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/feed-forward-network",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
  });
});
