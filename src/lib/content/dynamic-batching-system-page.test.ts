import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { SystemFlowGraph } from "@/features/models/components/SystemFlowGraph";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { SYSTEMS_DOCS_ROOT } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getSystemById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadSystemPage } from "@/lib/content/system-page";
import { renderSystemDocsShell } from "@/lib/content/system-shell-render";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = join(SYSTEMS_DOCS_ROOT, "dynamic-batching");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderAsyncMarkup(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("dynamic batching system page messages", () => {
  test("includes the required localized fields for the system template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Dynamic Batching");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whereItSits.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItDiffers?.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.practicalImpact.body?.length).toBeGreaterThan(0);
    expect(messages.openingSummary).toContain("batch window");
    expect(messages.sections?.practicalImpact.body).toContain("throughput");
    expect(messages.sections?.practicalImpact.body).toContain("latency");
  });
});

describe("dynamic batching canonical page bundle", () => {
  test("published route, registry record, English messages, and search document stay aligned", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = await loadSystemPage("dynamic-batching");
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getSystemById("system.dynamic-batching");

    expect(record?.slug).toBe("dynamic-batching");
    expect(record?.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("system.dynamic-batching");
    expect(page.frontmatter.kind).toBe("system");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);

    const publishedPage = pages.find(
      (entry) => entry.docsSlug === "systems/dynamic-batching",
    );
    expect(publishedPage?.url).toBe("/docs/systems/dynamic-batching");
    expect(publishedPage?.frontmatter.registryId).toBe(
      "system.dynamic-batching",
    );
    expect(publishedPage?.messages.title).toBe(bundledMessages.title);

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/systems/dynamic-batching",
    );
    expect(searchDocument?.registryId).toBe("system.dynamic-batching");
    expect(searchDocument?.kind).toBe("system");
    expect(searchDocument?.title).toBe(bundledMessages.title);
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining([
        "dynamic batching",
        "batch window",
        "request batching",
      ]),
    );
    expect(searchDocument?.tags).toEqual(["foundations"]);
    expect(searchDocument?.relatedIds).toEqual(record?.relatedIds ?? []);
  });

  test.each([
    "dynamic batching",
    "batch window",
    "request batching",
    "queueing delay",
    "utilization tradeoff",
  ] as const)("%s query resolves to the canonical dynamic batching system page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/systems/dynamic-batching");
  });

  test("loads the system page with the expected section structure and local graph assets", async () => {
    const page = await loadSystemPage("dynamic-batching");

    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(page.toc.some((item) => item.url === "#how-it-differs")).toBe(true);
    expect(page.assets.systemFlow).toMatchObject({
      graphId: "graph.dynamic-batching-system-flow",
      webRenderer: "react-flow",
    });
    expect(page.messages.sections?.howItWorks?.body).toContain("batch window");
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "compatible queued requests",
    );
    expect(page.messages.sections?.howItDiffers?.body).toContain(
      "pre-execution batch-window",
    );
    expect(page.messages.sections?.howItDiffers?.body).toContain(
      "token-generation set",
    );
    expect(page.messages.sections?.howItDiffers?.body).toContain(
      "execution path",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "first-token",
    );
    expect(page.messages.openingSummary).toContain(
      "compatible queued requests",
    );
    expect(getGraphById("graph.dynamic-batching-system-flow")?.subjectId).toBe(
      "system.dynamic-batching",
    );
  });
});

describe("dynamic batching docs route render", () => {
  test("renders the system shell with a folded opening summary", async () => {
    const page = await loadSystemPage("dynamic-batching");
    const html = await renderSystemDocsShell(page);

    expect(html).toContain('data-testid="folded-opening-summary"');
    expect(html).toContain("Opening summary");
    expect(html).toContain("batch window");
    expect(html).toContain("At a glance");
  });

  test("renders the canonical content with graph, tags, and related links", async () => {
    const page = await loadSystemPage("dynamic-batching");
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

    expect(html).toContain("System flow: how a batch window forms");
    expect(html).toContain("How It Differs");
    expect(html).toContain("pre-execution batch-window");
    expect(html).toContain("token-generation set");
    expect(html).toContain("execution path");
    expect(html).toContain("Wait through batch window");
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/continuous-batching"');
    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("throughput");
    expect(html).toContain("queue");
  });

  test("renders the dynamic batching system flow graph with batch-window behavior", async () => {
    const page = await loadSystemPage("dynamic-batching");
    const html = await renderAsyncMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        createElement(SystemFlowGraph, {
          registryId: "system.dynamic-batching",
          assetId: "systemFlow",
        }),
      ),
    );

    expect(html).toContain(
      'data-graph-title="graph.dynamic-batching-system-flow"',
    );
    expect(html).toContain("Dynamic Batching System Flow");
    expect(html).toContain("Wait through batch window");
    expect(html).toContain("Form compatible batch");
  });
});

describe("dynamic batching page assets", () => {
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
