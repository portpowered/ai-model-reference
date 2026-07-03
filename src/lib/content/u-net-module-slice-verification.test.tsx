/**
 * Consolidated review-facing slice proof for the U-Net module page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, related-link resolution, and teaching-asset wiring together.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { resolveCitations } from "@/lib/content/citations";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "module.u-net";
const SLUG = "u-net";
const PAGE_URL = "/docs/modules/u-net";
const GRAPH_ID = "graph.u-net-compute-flow";
const TABLE_ID = "table.u-net-comparison";

const pageDir = getDocsPageDir("modules", SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

const DISCOVERY_ALIAS_QUERIES = [
  "U-Net",
  "UNet",
  "diffusion U-Net",
  "image denoising backbone",
] as const;

const EXPECTED_CURATED_RELATED = [
  {
    registryId: "concept.denoising-generation",
    href: "/docs/glossary/denoising-generation",
  },
  {
    registryId: "training-regime.diffusion-training-objective",
    href: "/docs/training/diffusion-training-objective",
  },
  {
    registryId: "concept.conditioning",
    href: "/docs/glossary/conditioning",
  },
  {
    registryId: "concept.latent-space",
    href: "/docs/glossary/latent-space",
  },
  {
    registryId: "paper.latent-diffusion",
    href: "/docs/papers/latent-diffusion",
  },
  {
    registryId: "module.diffusion-transformer-block",
    href: "/docs/modules/diffusion-transformer-block",
  },
] as const;

function pageBaseUrlFromResults(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

async function renderUNetPageHtml(): Promise<string> {
  const page = await loadModulePage(SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("u-net module slice verification (u-net-module-page-005)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: SLUG,
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const record = getModuleById(REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
      section: "modules",
      docsSlug: "modules/u-net",
    });
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe(SLUG);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("module");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(validatePageAssetReferences(bundledAssets, bundledMessages)).toEqual(
      [],
    );
    expect(getGraphById(GRAPH_ID)?.subjectId).toBe(REGISTRY_ID);
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["modules", SLUG]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("U-Net");

    const rendered = await renderDocsSlugPage(["modules", SLUG], "en");
    expect(rendered).toBeDefined();
  });

  test("published English docs loader resolves the canonical route from pageDir", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.pageDir === pageDir);

    expect(page?.url).toBe(PAGE_URL);
    expect(page?.docsSlug).toBe("modules/u-net");
    expect(page?.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page?.frontmatter.kind).toBe("module");
    expect(page?.messages.title).toBe("U-Net");
  });

  test("curated related docs resolve only to shipped canonical targets and omit Stable Diffusion", () => {
    const source = getModuleById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected module.u-net in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const expected of EXPECTED_CURATED_RELATED) {
      expect(
        relatedItems.find((item) => item.registryId === expected.registryId)
          ?.href,
      ).toBe(expected.href);
    }

    expect(
      relatedItems.some((item) => item.registryId.includes("stable-diffusion")),
    ).toBe(false);
    expect(
      source.relatedIds.some((relatedId) =>
        relatedId.includes("stable-diffusion"),
      ),
    ).toBe(false);

    const citations = resolveCitations(source.citationIds);
    expect(citations).toHaveLength(2);
    expect(citations.map((citation) => citation.id).sort()).toEqual([
      "citation.denoising-diffusion-probabilistic-models",
      "citation.u-net-convolutional-networks",
    ]);
  });

  test("discovery metadata and live search resolve the canonical page for U-Net aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "U-Net",
        "UNet",
        "diffusion U-Net",
        "image denoising backbone",
      ]),
    );

    for (const query of DISCOVERY_ALIAS_QUERIES) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
    }
  });

  test("tag landing exposes the module under foundations and model-family discovery", async () => {
    const messages = await loadUiMessages();

    for (const tag of ["foundations", "model-family"] as const) {
      const groups = await loadTagResourceGroups(tag, messages, "en");
      const moduleGroup = groups.find((group) => group.kind === "module");
      expect(
        moduleGroup?.resources.some((resource) => resource.url === PAGE_URL),
      ).toBe(true);
    }
  });

  test(
    "rendered page shell exposes title, summary, teaching asset, tags, related docs, and citations without placeholders",
    async () => {
      const page = await loadModulePage(SLUG);
      const shellHtml = renderModuleDocsShell(page);
      const contentHtml = await renderUNetPageHtml();

      expect(shellHtml).toContain("U-Net");
      expect(shellHtml).toContain("U-shaped");
      expect(shellHtml).toContain('data-testid="folded-summary"');
      expect(contentHtml).toContain(`data-graph-id="${GRAPH_ID}"`);
      expect(contentHtml).toContain(`data-table-id="${TABLE_ID}"`);
      expect(contentHtml).toContain('data-testid="tag-pill-list"');
      expect(contentHtml).toContain('href="/tags/foundations"');
      expect(contentHtml).toContain('href="/tags/model-family"');
      expect(contentHtml).toContain('data-testid="curated-related-docs"');
      expect(contentHtml).toContain(
        'href="/docs/glossary/denoising-generation"',
      );
      expect(contentHtml).toContain(
        'href="/docs/training/diffusion-training-objective"',
      );
      expect(contentHtml).toContain('href="/docs/papers/latent-diffusion"');
      expect(contentHtml).toContain(
        'href="/docs/modules/diffusion-transformer-block"',
      );
      expect(contentHtml).toContain('data-testid="citation-list"');
      expect(contentHtml).toContain("Ronneberger");
      expect(contentHtml).toContain('data-graph-edge-kind="residual"');
      expect(contentHtml).not.toContain("stable-diffusion");
      expect(contentHtml).not.toContain("missing-content");
      expect(contentHtml).not.toContain("Reader Shortcut");
      expect(contentHtml).not.toMatch(/\{\{[^}]+\}\}/);
    },
    { timeout: 15_000 },
  );
});
