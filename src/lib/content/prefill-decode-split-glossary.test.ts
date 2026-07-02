import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PREFILL_DECODE_SPLIT_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { getConceptById, getModuleById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = PREFILL_DECODE_SPLIT_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

async function renderGlossaryHtml(slug: string): Promise<string> {
  const page = await loadGlossaryPage(slug);

  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("Phase 5 prefill/decode split glossary page (US-004)", () => {
  test("messages teach split resource profiles and tradeoffs in latency, memory, and cost", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Prefill/decode split");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "workers",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "latency",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "memory",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "cost",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "paged attention",
    );
  });

  test("page renders the full four-page journey and safe search handoffs for later serving topics", async () => {
    const page = await loadGlossaryPage("prefill-decode-split");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.prefill-decode-split");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expectGlossaryOmitsOpeningSummary(html);
    expectGlossarySingleTagPillList(html);
    expectHtmlToContainProse(html, "serving design");
    expectHtmlToContainProse(html, "cache transfer");
    expectHtmlToContainProse(html, "queueing overhead");
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/search?q=paged%20attention"');
    expect(html).toContain('href="/search?q=chunked%20prefill"');
    expect(html).toContain('href="/search?q=speculative%20decoding"');
    expect(html).toContain('href="/search?q=quantization"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("the four-page serving path is traversable through published links", async () => {
    const kvCache = await renderGlossaryHtml("kv-cache");
    const prefill = await renderGlossaryHtml("prefill");
    const decode = await renderGlossaryHtml("decode");
    const split = await renderGlossaryHtml("prefill-decode-split");

    expect(kvCache).toContain('href="/docs/glossary/prefill"');
    expect(prefill).toContain('href="/docs/glossary/decode"');
    expect(decode).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(split).toContain('href="/docs/glossary/decode"');
  });

  test("transformer, attention, autoregressive generation, MQA, GQA, and sliding-window attention expose entry points into the serving path", () => {
    const servingPathRegistryIds = new Set([
      "concept.kv-cache",
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
    ]);

    const sourceRecords = [
      getConceptById("concept.transformer"),
      getConceptById("concept.autoregressive-generation"),
      getModuleById("module.attention"),
      getModuleById("module.multi-query-attention"),
      getModuleById("module.grouped-query-attention"),
      getModuleById("module.sliding-window-attention"),
    ];

    for (const record of sourceRecords) {
      expect(record).toBeDefined();
      expect(
        record?.relatedIds.some((id) => servingPathRegistryIds.has(id)),
      ).toBe(true);
    }
  });
});
