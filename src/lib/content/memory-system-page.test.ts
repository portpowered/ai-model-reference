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

const pageDir = join(SYSTEMS_DOCS_ROOT, "memory");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderAsyncMarkup(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("memory canonical page bundle", () => {
  test("published route, registry record, English messages, and search document stay aligned", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = await loadSystemPage("memory");
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getSystemById("system.memory");

    expect(record?.slug).toBe("memory");
    expect(page.frontmatter.registryId).toBe("system.memory");
    expect(page.frontmatter.kind).toBe("system");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);

    const publishedPage = pages.find(
      (entry) => entry.docsSlug === "systems/memory",
    );
    expect(publishedPage?.url).toBe("/docs/systems/memory");
    expect(publishedPage?.frontmatter.registryId).toBe("system.memory");

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/systems/memory",
    );
    expect(searchDocument?.registryId).toBe("system.memory");
    expect(searchDocument?.kind).toBe("system");
    expect(searchDocument?.title).toBe(bundledMessages.title);
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining([
        "serving memory",
        "weight residency",
        "KV cache growth",
        "memory bandwidth",
      ]),
    );
    expect(searchDocument?.tags).toEqual([
      "foundations",
      "kv-cache",
      "context-window",
    ]);
    expect(searchDocument?.relatedIds).toEqual(record?.relatedIds ?? []);
  });

  test.each([
    "memory",
    "serving memory",
    "weight residency",
    "KV cache growth",
    "memory bandwidth",
  ] as const)("%s query resolves to the canonical memory system page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((result) => result.url === "/docs/systems/memory"),
    ).toBe(true);
  });

  test("loads the system page with the expected section structure and local graph assets", async () => {
    const page = await loadSystemPage("memory");

    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(page.assets.systemFlow).toMatchObject({
      graphId: "graph.memory-system-flow",
      webRenderer: "react-flow",
    });
    expect(page.messages.sections?.whatItIs?.body).toContain("model weights");
    expect(page.messages.sections?.whereItSits?.body).toContain("routing");
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "weights resident",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "sharpest one-time burst of cache growth",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "Decode then reuses those entries and extends them token by token",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "live serving concern after load",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "bandwidth",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "allocation becomes fragmented",
    );
    expect(page.messages.assets?.systemFlow?.alt).toContain(
      "must stay loaded before serving can begin",
    );
    expect(page.messages.assets?.systemFlow?.caption).toContain(
      "Weights dominate the starting footprint",
    );
    expect(page.messages.openingSummary).toContain("device spec sheet");
    expect(getGraphById("graph.memory-system-flow")?.subjectId).toBe(
      "system.memory",
    );
    expect(getGraphById("graph.memory-system-flow")?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "weights",
          size: expect.objectContaining({ width: 240 }),
        }),
        expect.objectContaining({
          id: "pressure",
          size: expect.objectContaining({ width: 260 }),
        }),
      ]),
    );
  });
});

describe("memory docs route render", () => {
  test("renders the system shell with a folded opening summary", async () => {
    const page = await loadSystemPage("memory");
    const html = await renderSystemDocsShell(page);

    expect(html).toContain('data-testid="folded-opening-summary"');
    expect(html).toContain("Opening summary");
    expect(html).toContain("device spec sheet");
    expect(html).toContain("At a glance");
  });

  test("renders the canonical content with nearby serving links and tags", async () => {
    const page = await loadSystemPage("memory");
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

    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/continuous-batching"');
    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/docs/systems/deployment"');
    expect(html).toContain('href="/docs/systems/on-disk-kv-cache"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('href="/tags/context-window"');
    expect(html).toContain("active requests remain alive");
    expect(html).toContain("KV cache");
    expect(html).toContain("batch carefully");
    expect(html).toContain("split");
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain("sharpest one-time burst of cache growth");
    expect(html).toContain("reuses those entries");
  });

  test("renders the memory system flow graph with the page-local graph asset", async () => {
    const page = await loadSystemPage("memory");
    const html = await renderAsyncMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        createElement(SystemFlowGraph, {
          registryId: "system.memory",
          assetId: "systemFlow",
        }),
      ),
    );

    expect(html).toContain('data-graph-title="graph.memory-system-flow"');
    expect(html).toContain("Memory System Flow");
    expect(html).toContain("Request and weight flow");
    expect(html).toContain("Control flow");
    expect(html).toContain("Keep model weights resident");
    expect(html).toContain("Prefill reads the whole prompt");
    expect(html).toContain("Decode reuses and extends cache");
    expect(html).toContain("Live serving memory keeps changing");
  });
});

describe("memory page assets", () => {
  test("accepts the page's local graph asset config", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.systemFlow).toMatchObject({
      type: "graph",
      graphId: "graph.memory-system-flow",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
