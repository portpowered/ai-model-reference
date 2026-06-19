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
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadSystemPage } from "@/lib/content/system-page";

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

describe("batching docs route render", () => {
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
    expect(html).toContain("Queue requests");
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/systems/on-disk-kv-cache"');
    expect(html).toContain('href="/docs/systems/expert-parallel-overlap"');
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
