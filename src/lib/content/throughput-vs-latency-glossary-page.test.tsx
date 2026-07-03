import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = getDocsPageDir("glossary", "throughput-vs-latency");
const messagesPath = join(pageDir, "messages/en.json");

describe("throughput vs latency glossary page (throughput-vs-latency-serving-metric-page-002)", () => {
  test("messages define throughput as aggregate work and latency as one request's wait", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Throughput Vs Latency");
    expect(messages.openingSummary?.toLowerCase()).toContain(
      "aggregate throughput",
    );
    expect(messages.openingSummary?.toLowerCase()).toContain(
      "individual answer feel slower",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "aggregate completed work over time",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "delay one request experiences",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "serving more concurrent work",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "aggregate throughput",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "more total tokens per second",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "time to first token",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "tokens per second",
    );
  });

  test("messages explain serving pressure mechanics and distinguish metric pages", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const metricComparison =
      messages.sections?.metricComparison?.body?.toLowerCase() ?? "";
    expect(metricComparison).toContain("time to first token");
    expect(metricComparison).toContain("inter-token latency");
    expect(metricComparison).toContain("tokens per second");
    expect(metricComparison).toContain("fleet-level");

    const runtimePressures =
      messages.sections?.runtimePressures?.body?.toLowerCase() ?? "";
    expect(runtimePressures).toContain("queueing");
    expect(runtimePressures).toContain("active request");
    expect(runtimePressures).toContain("batch");
    expect(runtimePressures).toContain("scheduler");
    expect(runtimePressures).toContain("memory bandwidth");
    expect(runtimePressures).toContain("key-value cache");
    expect(runtimePressures).toContain("cost per completed");
    expect(runtimePressures).toContain("user experience");
  });

  test("page renders serving pressure prose without reader-shortcut copy", async () => {
    const page = await loadGlossaryPage("throughput-vs-latency");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.throughput-vs-latency");

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
    expectHtmlToContainProse(html, "aggregate completed work");
    expectHtmlToContainProse(html, "delay one request experiences");
    expectHtmlToContainProse(html, "Serving more concurrent work");
    expectHtmlToContainProse(html, "time to first token");
    expectHtmlToContainProse(html, "inter-token latency");
    expectHtmlToContainProse(html, "tokens per second");
    expectHtmlToContainProse(html, "Concurrency pressure");
    expectHtmlToContainProse(html, "Batching and scheduling pressure");
    expectHtmlToContainProse(html, "Memory bandwidth pressure");
    expectHtmlToContainProse(html, "Serving cost");
    expect(html).toContain('href="/docs/glossary/time-to-first-token"');
    expect(html).toContain('href="/docs/glossary/inter-token-latency"');
    expect(html).toContain('href="/docs/glossary/tokens-per-second"');
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/concepts/prefill-decode-split"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});
