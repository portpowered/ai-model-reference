import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTagLandingPage } from "@/app/(site)/site-renderers";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { modulePageHref, tagPageHref } from "@/lib/content/content-hrefs";
import { MODULES_DOCS_ROOT } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getModuleById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

const pageDir = join(MODULES_DOCS_ROOT, "causal-attention");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("causal-attention page messages", () => {
  test("includes the localized fields required by the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Causal Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(
      messages.sections?.mathOrComputeSchema?.body?.length,
    ).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.label).toBe("Causal attention");
    expect(messages.math?.gqaSchema?.label).toBe("Bidirectional attention");
    expect(messages.math?.mhaSchema?.formula).toContain("M_{\\mathrm{causal}}");
  });
});

describe("loadModulePage causal-attention", () => {
  test("renders the canonical module structure with mask-pattern comparison and generation links", async () => {
    const page = await loadModulePage("causal-attention");

    expect(page.frontmatter.registryId).toBe("module.causal-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Causal Attention");

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
    expect(html).toContain("Autoregressive Generation");
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="causal"');
    expect(html).toContain('data-attention-variant-option="causal"');
    expect(html).toContain('data-attention-variant-option="bidirectional"');
    expect(html).toContain(
      'data-graph-id="graph.multi-head-attention-time-pattern"',
    );
    expect(html).toContain('data-graph-node-id="mha-time-kv-t-1"');
    expect(html).toContain('data-table-id="table.causal-attention-comparison"');
    expect(html).toContain("Visible context per query");
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/bidirectional-attention"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/decoder"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
  });
});

describe("causal-attention page assets", () => {
  test("resolve graph and table assets with message-backed copy", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual([
        "graph.multi-head-attention-time-pattern",
        "graph.bidirectional-attention-time-pattern",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});

describe("causal-attention discovery", () => {
  test("search document preserves causal-mask aliases and attention tagging", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === "/docs/modules/causal-attention",
    );

    expect(document?.kind).toBe("module");
    expect(document?.facets.kind).toBe("module");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "causal attention",
        "causal self-attention",
        "causal mask",
        "look-ahead mask",
      ]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["attention"]));
  });

  test.each([
    "causal attention",
    "causal self-attention",
    "causal mask",
    "look-ahead mask",
  ] as const)('search routes "%s" to the canonical causal-attention page', async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/modules/causal-attention");
    expect(
      results.some((result) => result.url === "/docs/modules/causal-attention"),
    ).toBe(true);
  });

  test("the attention tag landing renders a visible causal-attention link", async () => {
    const page = await renderTagLandingPage(
      {
        params: Promise.resolve({ slug: "attention" }),
      },
      "en",
    );
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Causal Attention");
    expect(html).toContain('href="/docs/modules/causal-attention"');
  });
});

describe("causal-attention route and shell convergence", () => {
  test("the canonical route resolves published docs, registry metadata, English messages, and visible discovery links together", async () => {
    const canonicalRoute = modulePageHref("causal-attention");
    const publishedPages = await loadPublishedDocsPages("en");
    const publishedPage = publishedPages.find(
      (page) => page.frontmatter.registryId === "module.causal-attention",
    );
    const sourcePage = source.getPage(["modules", "causal-attention"]);
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: "causal-attention",
    });
    const registryRecord = getModuleById("module.causal-attention");
    const html = renderModuleDocsShell(loadedPage);

    expect(publishedPage?.url).toBe(canonicalRoute);
    expect(sourcePage?.url).toBe(canonicalRoute);
    expect(loadedPage.frontmatter.registryId).toBe("module.causal-attention");
    expect(loadedPage.messages.title).toBe("Causal Attention");
    expect(registryRecord?.slug).toBe("causal-attention");
    expect(registryRecord?.status).toBe("published");
    expect(registryRecord?.aliases).toEqual(
      expect.arrayContaining([
        "causal attention",
        "causal self-attention",
        "causal mask",
      ]),
    );
    expect(registryRecord?.tags).toEqual(expect.arrayContaining(["attention"]));
    expect(html).toContain('data-registry-id="module.causal-attention"');
    expect(html).toContain(">Causal Attention<");
    expect(html).toContain('href="/docs/modules/bidirectional-attention"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain(`href="${tagPageHref("attention")}"`);
    expect(html).not.toMatch(/\bMISSING\b|undefined|Draft placeholder/);
  });
});
