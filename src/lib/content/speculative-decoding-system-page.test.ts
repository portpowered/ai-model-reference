import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { SYSTEMS_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getSystemById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadSystemPage } from "@/lib/content/system-page";
import { renderSystemDocsShell } from "@/lib/content/system-shell-render";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = join(SYSTEMS_DOCS_ROOT, "speculative-decoding");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderAsyncMarkup(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("speculative decoding system registry", () => {
  test("publishes the canonical speculative decoding system identity", () => {
    const record = getSystemById("system.speculative-decoding");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("system");
    expect(record?.slug).toBe("speculative-decoding");
    expect(record?.systemType).toBe("serving");
    expect(record?.conceptType).toBe("inference");
    expect(record?.aliases).toEqual([
      "speculative decoding",
      "draft and verify decoding",
      "draft-and-verify decoding",
      "draft model serving",
      "assisted decoding",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.decode",
      "concept.prefill-decode-split",
      "concept.kv-cache",
      "system.batching",
      "system.routing",
      "system.inference-engine",
      "system.on-disk-kv-cache",
      "system.deployment",
    ]);
  });
});

describe("speculative decoding canonical page bundle", () => {
  test("published route, registry record, English messages, and search document stay aligned", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = await loadSystemPage("speculative-decoding");
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getSystemById("system.speculative-decoding");

    expect(record?.slug).toBe("speculative-decoding");
    expect(page.frontmatter.registryId).toBe("system.speculative-decoding");
    expect(page.frontmatter.kind).toBe("system");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);

    const publishedPage = pages.find(
      (entry) => entry.docsSlug === "systems/speculative-decoding",
    );
    expect(publishedPage?.url).toBe("/docs/systems/speculative-decoding");
    expect(publishedPage?.frontmatter.registryId).toBe(
      "system.speculative-decoding",
    );
    expect(publishedPage?.messages.title).toBe(bundledMessages.title);

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/systems/speculative-decoding",
    );
    expect(searchDocument?.registryId).toBe("system.speculative-decoding");
    expect(searchDocument?.kind).toBe("system");
    expect(searchDocument?.title).toBe(bundledMessages.title);
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining([
        "draft and verify decoding",
        "draft-and-verify decoding",
        "draft model serving",
      ]),
    );
    expect(searchDocument?.tags).toEqual(["foundations", "kv-cache"]);
    expect(searchDocument?.relatedIds).toEqual(record?.relatedIds ?? []);
  });

  test.each([
    "speculative decoding",
    "draft and verify decoding",
    "draft model serving",
  ] as const)("%s query resolves to the canonical speculative decoding system page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/systems/speculative-decoding");
  });

  test("latency reduction queries still surface the speculative decoding page through normal discovery", async () => {
    const results = await docsSearchApi.search("latency reduction");

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (result) => result.url === "/docs/systems/speculative-decoding",
      ),
    ).toBe(true);
  });

  test("loads the system page with the expected section structure and empty local assets", async () => {
    const page = await loadSystemPage("speculative-decoding");

    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "longest prefix",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "multiple accepted tokens",
    );
    expect(page.messages.sections?.whereItSits?.body).toContain(
      "inference-serving runtime",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "requests are short",
    );
    expect(page.messages.openingSummary).toContain(
      "cheaper draft path guess several tokens",
    );
    expect(page.assets).toEqual({});
  });
});

describe("speculative decoding docs route render", () => {
  test("renders the system shell with a folded opening summary", async () => {
    const page = await loadSystemPage("speculative-decoding");
    const html = await renderSystemDocsShell(page);

    expect(html).toContain('data-testid="folded-opening-summary"');
    expect(html).toContain("Opening summary");
    expect(html).toContain("latency-reduction technique");
    expect(html).toContain("At a glance");
  });

  test("renders the canonical content with nearby serving links and tags", async () => {
    const page = await loadSystemPage("speculative-decoding");
    const html = await renderAsyncMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        page.content,
      ),
    );

    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/docs/systems/on-disk-kv-cache"');
    expect(html).toContain('href="/docs/systems/deployment"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain("draft path");
    expect(html).toContain("decode latency");
    expect(html).toContain("serving system around the same underlying model");
    expect(html).toContain("inference-serving runtime");
    expect(html).toContain("deployment choices");
  });
});

describe("speculative decoding page assets", () => {
  test("accepts the page's empty local asset config", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets).toEqual({});
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
