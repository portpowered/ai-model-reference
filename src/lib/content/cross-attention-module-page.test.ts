import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { MODULES_DOCS_ROOT } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { getModuleById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const pageDir = join(MODULES_DOCS_ROOT, "cross-attention");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("cross-attention page messages", () => {
  test("includes the localized fields required by the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Cross-Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(
      messages.sections?.mathOrComputeSchema?.body?.length,
    ).toBeGreaterThan(0);
    expect(messages.math?.selfAttentionSchema?.label).toBe("Self-attention");
    expect(messages.math?.crossAttentionSchema?.label).toBe("Cross-attention");
    expect(messages.math?.crossAttentionSchema?.formula).toContain("Q(Y)");
    expect(messages.math?.crossAttentionSchema?.formula).toContain("K(X)");
    expect(messages.openingSummary).not.toMatch(/encoder-decoder|multimodal/i);
    expect(messages.sections?.whatItIs?.body).not.toMatch(
      /encoder-decoder|multimodal/i,
    );
    expect(messages.sections?.howItWorks?.body).toMatch(/queries/i);
    expect(messages.sections?.howItWorks?.body).toMatch(/keys and values/i);
    expect(messages.sections?.howItWorks?.body).toMatch(/softmax/i);
  });
});

describe("loadModulePage cross-attention", () => {
  test("renders the canonical module structure with separate-memory teaching aids", async () => {
    const page = await loadModulePage("cross-attention");

    expect(page.frontmatter.registryId).toBe("module.cross-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Cross-Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("At a glance");
    expect(html).toContain("Math Or Compute Schema");
    expect(html).toContain("Compared To Nearby Modules");
    expect(html).toContain("external memory slots");
    expect(html).toContain(
      "builds queries, keys, and values from the same stream",
    );
    expect(html).toContain("head-parallel execution pattern that splits");
    expect(html).toContain(
      "usually still reads the same growing sequence but blocks future positions",
    );
    expect(html).toContain(
      "again changes the memory source rather than simply opening left and right context",
    );
    expect(html).toContain("execution that can wrap either");
    expect(html).toContain("lookups");
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="cross"');
    expect(html).toContain('data-attention-variant-option="self"');
    expect(html).toContain('data-attention-variant-option="cross"');
    expect(html).toContain(
      'data-graph-id="graph.cross-attention-memory-pattern"',
    );
    expect(html).toContain(
      "Cross-attention keeps the query on the active target stream while keys and values stay on a separate memory source",
    );
    expect(html).toContain('data-graph-node-id="cross-time-kv-s-2"');
    expect(html).toContain('data-table-id="table.cross-attention-comparison"');
    expect(html).toContain("Causal Attention");
    expect(html).toContain("Where keys and values come from");
    expect(html).toContain(
      "The same growing sequence, but future positions are masked out",
    );
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Vaswani, Ashish");
    expect(html).toContain('href="https://arxiv.org/abs/1706.03762"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
  });

  test("renders the opening summary in the shared docs shell", async () => {
    const page = await loadModulePage("cross-attention");
    const html = renderModuleDocsShell(page);

    expect(html).toContain('data-testid="folded-summary"');
    expect(html).toContain(
      "queries come from one stream while keys and values come from a separate memory source",
    );
  });
});

describe("cross-attention page assets", () => {
  test("resolve graph and table assets with message-backed copy", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.defaultVariantId).toBe("cross");
      expect(assets.computeFlow.captionKey).toBe("assets.computeFlow.caption");
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual([
        "graph.multi-head-attention-time-pattern",
        "graph.cross-attention-memory-pattern",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(messages.tables?.comparison?.columns?.causal?.title).toBe(
      "Causal Attention",
    );
  });
});

describe("cross-attention published discovery contract", () => {
  test("keeps the canonical route discoverable through the published docs bundle and search documents", async () => {
    const record = getModuleById("module.cross-attention");
    if (!record) {
      throw new Error("expected module.cross-attention in registry runtime");
    }

    expect(record.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(record.id)).toBe(true);

    const pages = await loadPublishedDocsPages("en");
    const registry = await loadRegistry();
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === "/docs/modules/cross-attention",
    );

    expect(document).toBeDefined();
    expect(document?.kind).toBe("module");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "cross attention",
        "cross-attention",
        "encoder-decoder attention",
      ]),
    );
    expect(document?.tags).toContain("attention");
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "module.attention",
        "module.multi-head-attention",
        "concept.encoder-decoder",
        "concept.multimodal-model",
      ]),
    );
  });
});
