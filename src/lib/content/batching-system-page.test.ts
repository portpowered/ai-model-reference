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

const pageDir = join(SYSTEMS_DOCS_ROOT, "batching");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderAsyncMarkup(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("batching system page messages", () => {
  test("includes the required localized fields for the system template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Batching");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whereItSits.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.practicalImpact.body?.length).toBeGreaterThan(0);
  });
});

describe("loadSystemPage batching", () => {
  test("loads the canonical batching system page with local assets", async () => {
    const page = await loadSystemPage("batching");

    expect(page.frontmatter.registryId).toBe("system.batching");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Batching");
    expect(page.messages.openingSummary).toContain("serving habit");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
  });
});

describe("batching search and registry convergence", () => {
  test("published route, registry record, English messages, and search document stay aligned", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = await loadSystemPage("batching");
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getSystemById("system.batching");

    expect(record?.slug).toBe("batching");
    expect(page.frontmatter.registryId).toBe("system.batching");
    expect(page.frontmatter.kind).toBe("system");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);

    const publishedPage = pages.find(
      (entry) => entry.docsSlug === "systems/batching",
    );
    expect(publishedPage?.url).toBe("/docs/systems/batching");
    expect(publishedPage?.frontmatter.registryId).toBe("system.batching");
    expect(publishedPage?.messages.title).toBe(bundledMessages.title);

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/systems/batching",
    );
    expect(searchDocument?.registryId).toBe("system.batching");
    expect(searchDocument?.kind).toBe("system");
    expect(searchDocument?.title).toBe(bundledMessages.title);
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining([
        "request batching",
        "inference batching",
        "throughput latency tradeoff",
      ]),
    );
    expect(searchDocument?.tags).toEqual(["foundations"]);
    expect(searchDocument?.relatedIds).toEqual(record?.relatedIds ?? []);
  });

  test.each([
    "batching",
    "request batching",
    "inference batching",
    "throughput latency tradeoff",
  ] as const)("%s query resolves to the canonical batching system page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/systems/batching");
  });

  test("current shipped docs do not yet include canonical latency or throughput pages", async () => {
    const pages = await loadPublishedDocsPages("en");

    expect(
      pages.find((entry) => entry.docsSlug === "concepts/latency"),
    ).toBeUndefined();
    expect(
      pages.find((entry) => entry.docsSlug === "concepts/throughput"),
    ).toBeUndefined();
    expect(
      pages.find((entry) => entry.docsSlug === "systems/latency"),
    ).toBeUndefined();
    expect(
      pages.find((entry) => entry.docsSlug === "systems/throughput"),
    ).toBeUndefined();
  });
});

describe("batching docs route render", () => {
  test("renders the system shell with a visible folded opening summary", async () => {
    const page = await loadSystemPage("batching");
    const html = await renderSystemDocsShell(page);

    expect(html).toContain('data-opening-summary="folded"');
    expect(html).toContain('data-testid="folded-summary"');
    expect(html).toContain("waiting just long enough");
    expect(html).toContain("At a glance");
    expect(html.indexOf('data-opening-summary="folded"')).toBeLessThan(
      html.indexOf('aria-label="At a glance"'),
    );
  });

  test("renders the canonical batching content with graph, tags, and related links", async () => {
    const page = await loadSystemPage("batching");
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

    expect(html).toContain("At a glance");
    expect(html).toContain("System flow: how a batch forms and runs");
    expect(html).toContain("Legend:");
    expect(html).toContain("Queue requests");
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/systems/on-disk-kv-cache"');
    expect(html).toContain('href="/docs/systems/expert-parallel-overlap"');
    expect(html).toContain("batch formation");
    expect(html).toContain("total system output improves");
    expect(html).toContain("prefill/decode split");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("throughput");
    expect(html).toContain("queue");
  });
});

describe("batching system page assets", () => {
  test("resolves the system flow graph with message-backed alt text and caption", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.systemFlow.type).toBe("graph");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
