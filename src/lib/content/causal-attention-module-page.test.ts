import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { CAUSAL_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = CAUSAL_ATTENTION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const pageUrl = "/docs/modules/causal-attention";

describe("causal-attention registry record", () => {
  test("is published as a first-class attention variant with decoder and token relationships", () => {
    const record = getModuleById("module.causal-attention");

    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("causal-attention");
    expect(record?.moduleFamily).toBe("attention");
    expect(record?.conceptType).toBe("attention-variant");
    expect(record?.aliases).toEqual([
      "causal attention",
      "causal self-attention",
      "causal masking",
      "causal mask",
      "look-ahead mask",
      "look ahead mask",
    ]);
    expect(record?.tags).toEqual(["attention", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "concept.decoder",
      "concept.token",
      "concept.autoregressive-generation",
      "concept.prefill-decode-split",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("module.causal-attention")).toBe(
      true,
    );
  });
});

describe("causal-attention page bundle", () => {
  test("published page metadata and messages match the registry-backed contract", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.url === pageUrl);

    expect(page).toBeDefined();
    expect(page?.frontmatter.registryId).toBe("module.causal-attention");
    expect(page?.frontmatter.status).toBe("published");
    expect(page?.frontmatter.tags).toEqual(["attention", "kv-cache"]);
    expect(page?.frontmatter.aliases).toEqual([
      "causal attention",
      "causal self-attention",
      "causal masking",
      "causal mask",
      "look-ahead mask",
      "look ahead mask",
    ]);
    expect(page?.messages.title).toBe("Causal Attention");
    expect(page?.messages.openingSummary).toContain("no-looking-ahead rule");
    expect(page?.messages.sections?.whatItIs.body).toContain(
      "mask that blocks future positions",
    );
    expect(page?.messages.sections?.practicalBenefit.body).toContain(
      "prefill/decode split",
    );
  });

  test("curated related docs resolve to shipped attention and generation pages", () => {
    const source = getModuleById("module.causal-attention");
    if (!source) {
      throw new Error("expected module.causal-attention in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.some(
        (item) =>
          item.registryId === "module.attention" &&
          item.href === "/docs/modules/attention",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.decoder" &&
          item.href === "/docs/glossary/decoder",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.token" &&
          item.href === "/docs/glossary/token",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.prefill-decode-split" &&
          item.href === "/docs/glossary/prefill-decode-split",
      ),
    ).toBe(true);
  });

  test("assets resolve the graph and comparison table with message-backed copy", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });

  test("rendered shell exposes the canonical summary, tags, and nearby related links", async () => {
    const page = await loadModulePage("causal-attention");
    const html = renderModuleDocsShell(page);

    expect(html).toContain("Causal Attention");
    expect(html).toContain(
      "lets each token read only earlier tokens and itself, never future tokens",
    );
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/decoder"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

describe("causal-attention discovery surfaces", () => {
  test("published docs pages and attention tag landing include the canonical route", async () => {
    const pages = await loadPublishedDocsPages("en");
    expect(
      pages.some(
        (page) =>
          page.url === pageUrl &&
          page.frontmatter.registryId === "module.causal-attention",
      ),
    ).toBe(true);

    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("attention", messages, "en");
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(
      moduleGroup?.resources.some((resource) => resource.url === pageUrl),
    ).toBe(true);
  });

  test("search finds the canonical page by title and alias queries", async () => {
    for (const query of [
      "causal attention",
      "causal self-attention",
      "causal masking",
      "causal mask",
      "look ahead mask",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === pageUrl)).toBe(true);
    }
  });
});
