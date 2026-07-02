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

const pageDir = join(SYSTEMS_DOCS_ROOT, "continuous-batching");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderAsyncMarkup(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("continuous batching system registry", () => {
  test("publishes the canonical continuous batching system identity", () => {
    const record = getSystemById("system.continuous-batching");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("system");
    expect(record?.slug).toBe("continuous-batching");
    expect(record?.systemType).toBe("serving");
    expect(record?.conceptType).toBe("inference");
    expect(record?.aliases).toEqual([
      "continuous batching",
      "continuous decode batching",
      "decode refill",
      "static vs continuous batching",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.decode",
      "concept.prefill-decode-split",
      "concept.kv-cache",
      "system.batching",
      "system.speculative-decoding",
      "system.routing",
      "system.inference-engine",
      "system.on-disk-kv-cache",
      "system.deployment",
    ]);
  });
});

describe("continuous batching canonical page bundle", () => {
  test("published route, registry record, English messages, and search document stay aligned", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = await loadSystemPage("continuous-batching");
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getSystemById("system.continuous-batching");

    expect(record?.slug).toBe("continuous-batching");
    expect(page.frontmatter.registryId).toBe("system.continuous-batching");
    expect(page.frontmatter.kind).toBe("system");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);

    const publishedPage = pages.find(
      (entry) => entry.docsSlug === "systems/continuous-batching",
    );
    expect(publishedPage?.url).toBe("/docs/systems/continuous-batching");
    expect(publishedPage?.frontmatter.registryId).toBe(
      "system.continuous-batching",
    );

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/systems/continuous-batching",
    );
    expect(searchDocument?.registryId).toBe("system.continuous-batching");
    expect(searchDocument?.kind).toBe("system");
    expect(searchDocument?.title).toBe(bundledMessages.title);
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining([
        "continuous decode batching",
        "decode refill",
        "static vs continuous batching",
      ]),
    );
    expect(searchDocument?.tags).toEqual(["foundations", "kv-cache"]);
    expect(searchDocument?.relatedIds).toEqual(record?.relatedIds ?? []);
  });

  test.each([
    "continuous batching",
    "continuous decode batching",
    "decode refill",
    "static vs continuous batching",
  ] as const)("%s query resolves to the canonical continuous batching system page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (result) => result.url === "/docs/systems/continuous-batching",
      ),
    ).toBe(true);
  });

  test("loads the system page with the expected section structure and local graph assets", async () => {
    const page = await loadSystemPage("continuous-batching");

    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(page.assets.systemFlow).toMatchObject({
      graphId: "graph.continuous-batching-system-flow",
      webRenderer: "react-flow",
    });
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "incremental refill",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "fixed batch boundary",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "fairness pressure",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "traffic is sparse",
    );
    expect(page.messages.assets?.systemFlow?.alt).toContain("open slots");
    expect(page.messages.openingSummary).toContain("decode-heavy workloads");
    expect(
      getGraphById("graph.continuous-batching-system-flow")?.subjectId,
    ).toBe("system.continuous-batching");
  });
});

describe("continuous batching docs route render", () => {
  test("renders the system shell with a folded opening summary", async () => {
    const page = await loadSystemPage("continuous-batching");
    const html = await renderSystemDocsShell(page);

    expect(html).toContain('data-testid="folded-opening-summary"');
    expect(html).toContain("Opening summary");
    expect(html).toContain("decode-heavy workloads");
    expect(html).toContain("At a glance");
  });

  test("renders the canonical content with nearby serving links and tags", async () => {
    const page = await loadSystemPage("continuous-batching");
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
    expect(html).toContain('href="/docs/concepts/prefill-decode-split"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/speculative-decoding"');
    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/docs/systems/on-disk-kv-cache"');
    expect(html).toContain('href="/docs/systems/deployment"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain("active decode set");
    expect(html).toContain("incremental refill");
    expect(html).toContain("idle gaps");
    expect(html).toContain("fairness pressure");
  });

  test("renders the continuous batching system flow graph with refill behavior", async () => {
    const page = await loadSystemPage("continuous-batching");
    const html = await renderAsyncMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        createElement(SystemFlowGraph, {
          registryId: "system.continuous-batching",
          assetId: "systemFlow",
        }),
      ),
    );

    expect(html).toContain(
      'data-graph-title="graph.continuous-batching-system-flow"',
    );
    expect(html).toContain("Continuous Batching System Flow");
    expect(html).toContain("Control flow");
    expect(html).toContain("Keep active decode set alive");
    expect(html).toContain("Refill open slots for the next turn");
  });
});

describe("continuous batching page assets", () => {
  test("accepts the page's local graph asset config", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.systemFlow).toMatchObject({
      type: "graph",
      graphId: "graph.continuous-batching-system-flow",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
