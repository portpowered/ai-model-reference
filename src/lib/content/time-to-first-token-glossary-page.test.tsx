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

const pageDir = getDocsPageDir("glossary", "time-to-first-token");
const messagesPath = join(pageDir, "messages/en.json");

describe("time to first token glossary page (time-to-first-token-serving-metric-page-002)", () => {
  test("messages expand Time To First Token before TTFT and teach serving-metric distinctions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Time To First Token");
    expect(messages.openingSummary).toMatch(/^Time To First Token \(TTFT\)/);
    expect(messages.sections?.whatItIs.body).toMatch(
      /^Time To First Token \(TTFT\)/,
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "queueing",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "prefill",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "kv cache",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "first decode step",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "throughput",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "total response time",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "tokens per second",
    );
  });

  test("page renders TTFT explainer prose and serving-path links without reader-shortcut copy", async () => {
    const page = await loadGlossaryPage("time-to-first-token");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.time-to-first-token");

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
    expectHtmlToContainProse(html, "Time To First Token");
    expectHtmlToContainProse(html, "queueing");
    expectHtmlToContainProse(html, "inter-token latency");
    expectHtmlToContainProse(html, "total response time");
    expectHtmlToContainProse(html, "tokens per second");
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/concepts/prefill-decode-split"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});
