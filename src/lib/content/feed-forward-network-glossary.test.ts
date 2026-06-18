import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { FEED_FORWARD_NETWORK_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = FEED_FORWARD_NETWORK_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 feed-forward network module page (US-002)", () => {
  test("registry record is published with aliases, tags, and curated related ids", () => {
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

  test("curated related links transformer architecture, standard FFN, mixture of experts, and activation", () => {
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

  test("messages describe the FFN family using module-template sections", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Feed-Forward Network");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "attention",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "position",
    );
    expect(messages.sections?.practicalBenefit.body?.toLowerCase()).toContain(
      "swish gated linear unit",
    );
    expect(
      messages.sections?.comparedToNearbyModules.body?.toLowerCase(),
    ).toContain("tradeoffs");
    expect(messages.math?.standardSchema?.formula).toContain("\\mathrm{FFN}");
    expect(messages.math?.swigluSchema?.formula).toContain("\\mathrm{SwiGLU}");
  });

  test("page renders module-template sections, math comparison, and FFN-family links", async () => {
    const page = await loadModulePage("feed-forward-network");

    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("module.feed-forward-network");

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
    expect(html).toContain("What It Optimizes");
    expect(html).toContain("Compared To Nearby Modules");
    expectHtmlToContainProse(html, "same post-attention slot");
    expect(html).toContain('data-registry-id="module.feed-forward-network"');
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain(
      'data-graph-id="graph.standard-ffn-parallel-baseline"',
    );
    expect(html).toContain('data-math-schema="standard"');
    expect(html).toContain('data-math-schema="swiglu"');
    expect(html).toContain('data-page-asset="comparisonTable"');
    expect(html).toContain(
      'data-table-id="table.feed-forward-network-comparison"',
    );
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/modules/mixture-of-experts"');
    expect(html).toContain('href="/docs/glossary/activation"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records feed-forward network with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/modules/feed-forward-network",
    );
    expect(document?.kind).toBe("module");
    expect(document?.facets.kind).toBe("module");
  });
});
