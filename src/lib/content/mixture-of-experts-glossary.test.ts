import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { MIXTURE_OF_EXPERTS_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { expectHtmlToContainProse } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const pageDir = MIXTURE_OF_EXPERTS_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 mixture of experts module page (US-003)", () => {
  test("registry record is published with aliases, tags, and curated related ids", () => {
    const record = getConceptById("concept.mixture-of-experts");
    const moduleRecord = getModuleById("module.mixture-of-experts");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "MoE",
      "sparse MoE",
      "mixture-of-experts architecture",
      "expert routing",
    ]);
    expect(moduleRecord?.aliases).toContain("mixture-of-experts layer");
    expect(record?.aliases).not.toContain("mixture-of-experts layer");
    expect(record?.tags).toEqual(["feed-forward", "foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.feed-forward-network",
      "concept.standard-ffn",
      "module.mixture-of-experts",
      "module.deepseekmoe",
      "model.deepseek-v4-pro",
      "concept.transformer-architecture",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.sparsely-gated-mixture-of-experts-layer",
      "citation.deepseek-v4-paper",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.mixture-of-experts")).toBe(
      true,
    );
  });

  test("curated related links bridge the broad concept to nearby module and model pages", () => {
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

    const moeModule = items.find(
      (item) => item.registryId === "module.mixture-of-experts",
    );
    expect(moeModule?.href).toBe("/docs/modules/mixture-of-experts");
    expect(moeModule?.isPlanned).toBe(false);

    const deepseekMoe = items.find(
      (item) => item.registryId === "module.deepseekmoe",
    );
    expect(deepseekMoe?.href).toBe("/docs/modules/deepseekmoe");
    expect(deepseekMoe?.isPlanned).toBe(false);

    const deepseekV4Pro = items.find(
      (item) => item.registryId === "model.deepseek-v4-pro",
    );
    expect(deepseekV4Pro?.href).toBe("/docs/models/deepseek-v4-pro");
    expect(deepseekV4Pro?.isPlanned).toBe(false);

    const architecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(architecture?.href).toBe("/docs/concepts/transformer-architecture");
    expect(architecture?.isPlanned).toBe(false);
  });

  test("messages explain expert routing, top-k activation, and capacity tradeoffs in module-template sections", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Mixture of Experts");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("router");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("top-k");
    expect(messages.sections?.whatItOptimizes.body?.toLowerCase()).toContain(
      "capacity",
    );
    expect(
      messages.sections?.comparedToNearbyModules.body?.toLowerCase(),
    ).toContain("sparse top-k routing");
    expect(
      messages.sections?.limitationsAndTradeoffs.body?.toLowerCase(),
    ).toContain("load-balancing");
    expect(messages.math?.standardSchema?.formula).toContain("\\mathrm{FFN}");
    expect(messages.math?.moeSchema?.formula).toContain("\\mathrm{MoE}");
  });

  test("page renders MoE module-template sections, switcher, and FFN-family related links", async () => {
    const page = await loadModulePage("mixture-of-experts");

    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("module.mixture-of-experts");

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
    expect(html).toContain("Practical Benefit");
    expect(html).toContain("Compared To Nearby Modules");
    expect(html).toContain("Why It Still Matters");
    expectHtmlToContainProse(html, "router picks a small top-k expert set");
    expect(html).toContain('data-registry-id="module.mixture-of-experts"');
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain(
      'data-graph-id="graph.mixture-of-experts-routing-flow"',
    );
    expect(html).toContain('data-math-schema="standard"');
    expect(html).toContain('data-math-schema="moe"');
    expect(html).toContain('data-page-asset="comparisonTable"');
    expect(html).toContain(
      'data-table-id="table.mixture-of-experts-comparison"',
    );
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
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
    expect(document?.kind).toBe("module");
    expect(document?.facets.kind).toBe("module");
  });
});
