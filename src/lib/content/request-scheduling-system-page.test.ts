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
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getSystemById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadSystemPage } from "@/lib/content/system-page";
import { renderSystemDocsShell } from "@/lib/content/system-shell-render";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = getDocsPageDir("systems", "request-scheduling");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderAsyncMarkup(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("request scheduling system page messages", () => {
  test("includes the required localized fields for the system template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Request Scheduling");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whereItSits.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.practicalImpact.body?.length).toBeGreaterThan(0);
  });

  test("defines scheduling in isolation and covers queue behavior, tradeoffs, and admission boundaries", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.openingSummary).toContain(
      "separate from choosing a serving path",
    );
    expect(messages.sections?.whatItIs.body).toContain(
      "does not change model weights",
    );
    expect(messages.sections?.whereItSits.body).toContain(
      "Admission decides whether a request may enter",
    );
    expect(messages.sections?.howItWorks.body).toContain("Queue order");
    expect(messages.sections?.howItWorks.body).toContain("Prefill work");
    expect(messages.sections?.howItWorks.body).toContain("Decode work");
    expect(messages.sections?.howItWorks.body).toContain("Fairness policies");
    expect(messages.sections?.howItWorks.body).toContain("Deadline-aware");
    expect(messages.sections?.howItWorks.body).toContain(
      "Batching opportunities",
    );
    expect(messages.sections?.howItWorks.body).toContain("Memory limits");
    expect(messages.sections?.howItWorks.body).toContain("Cancellation");
    expect(messages.sections?.howItWorks.body).toContain("Admission control");
    expect(messages.sections?.practicalImpact.body).toContain("Latency rises");
    expect(messages.sections?.practicalImpact.body).toContain(
      "Fairness breaks",
    );
    expect(messages.sections?.practicalImpact.body).toContain(
      "Throughput rises",
    );
    expect(messages.sections?.practicalImpact.body).toContain(
      "Memory pressure shows up",
    );
  });
});

describe("loadSystemPage request-scheduling", () => {
  test("loads the canonical request scheduling system page with local assets", async () => {
    const page = await loadSystemPage("request-scheduling");

    expect(page.frontmatter.registryId).toBe("system.request-scheduling");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Request Scheduling");
    expect(page.messages.openingSummary).toContain("serving control");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(page.toc.some((item) => item.url === "#practical-impact")).toBe(
      true,
    );
    expect(page.assets.systemFlow).toMatchObject({
      graphId: "graph.request-scheduling-system-flow",
      webRenderer: "react-flow",
    });
  });
});

describe("request scheduling search and registry convergence", () => {
  test("published route, registry record, English messages, and search document stay aligned", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = await loadSystemPage("request-scheduling");
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getSystemById("system.request-scheduling");

    expect(record?.slug).toBe("request-scheduling");
    expect(page.frontmatter.registryId).toBe("system.request-scheduling");
    expect(page.frontmatter.kind).toBe("system");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);

    const publishedPage = pages.find(
      (entry) => entry.docsSlug === "systems/request-scheduling",
    );
    expect(publishedPage?.url).toBe("/docs/systems/request-scheduling");
    expect(publishedPage?.frontmatter.registryId).toBe(
      "system.request-scheduling",
    );
    expect(publishedPage?.messages.title).toBe(bundledMessages.title);

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/systems/request-scheduling",
    );
    expect(searchDocument?.registryId).toBe("system.request-scheduling");
    expect(searchDocument?.kind).toBe("system");
    expect(searchDocument?.title).toBe(bundledMessages.title);
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining([
        "scheduler",
        "request scheduling",
        "queueing",
        "admission control",
        "fairness",
        "latency",
        "throughput",
      ]),
    );
    expect(searchDocument?.tags).toEqual(["foundations"]);
    expect(searchDocument?.relatedIds).toEqual(record?.relatedIds ?? []);
  });

  test.each([
    "scheduler",
    "request scheduling",
    "queueing",
    "admission control",
    "fairness",
    "latency",
    "throughput",
  ] as const)("%s query resolves to the canonical request scheduling system page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/systems/request-scheduling");
  });
});

describe("request scheduling docs route render", () => {
  test("renders the system shell with a visible folded opening summary", async () => {
    const page = await loadSystemPage("request-scheduling");
    const html = await renderSystemDocsShell(page);

    expect(html).toContain('data-testid="folded-opening-summary"');
    expect(html).toContain("Opening summary");
    expect(html).toContain("serving control");
    expect(html).toContain("At a glance");
    expect(html.indexOf('data-testid="folded-opening-summary"')).toBeLessThan(
      html.indexOf('aria-label="At a glance"'),
    );
  });

  test("renders the canonical request scheduling content with tags and related links", async () => {
    const page = await loadSystemPage("request-scheduling");
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
    expect(html).toContain("System flow: how queued work gets scheduled");
    expect(html).toContain("Legend:");
    expect(html).toContain("Queue admitted requests");
    expect(html).toContain("What It Is");
    expect(html).toContain("Where It Sits");
    expect(html).toContain("How It Works");
    expect(html).toContain("Practical Impact");
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/continuous-batching"');
    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/docs/systems/deployment"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("prefill");
    expect(html).toContain("decode");
    expect(html).toContain("queue");
    expect(html).toContain("throughput");
    expect(html).toContain("Fairness policies");
    expect(html).toContain("Admission control");
    expect(html).toContain("Memory pressure shows up");
    expect(html).toContain("Cancellation");
  });

  test("renders the request scheduling system flow graph with the page-local graph asset", async () => {
    const page = await loadSystemPage("request-scheduling");
    const html = await renderAsyncMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        createElement(SystemFlowGraph, {
          registryId: "system.request-scheduling",
          assetId: "systemFlow",
        }),
      ),
    );

    expect(html).toContain(
      'data-graph-title="graph.request-scheduling-system-flow"',
    );
    expect(html).toContain("Queue admitted requests");
    expect(html).toContain("Pick next work");
    expect(html).toContain("Run prefill or decode step");
    expect(html).toContain("Continue active requests");
    expect(
      getGraphById("graph.request-scheduling-system-flow")?.subjectId,
    ).toBe("system.request-scheduling");
  });
});

describe("request scheduling system page assets", () => {
  test("resolves the system flow graph with message-backed alt text and caption", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.systemFlow.type).toBe("graph");
    if (assets.systemFlow.type === "graph") {
      expect(assets.systemFlow.graphId).toBe(
        "graph.request-scheduling-system-flow",
      );
    }
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
