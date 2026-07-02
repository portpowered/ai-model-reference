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

const pageDir = getDocsPageDir("glossary", "tokens-per-second");
const messagesPath = join(pageDir, "messages/en.json");

describe("tokens per second glossary page (tokens-per-second-glossary-page-002)", () => {
  test("messages expand Tokens Per Second before shorthand and teach throughput basics", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Tokens Per Second");
    expect(messages.openingSummary).toMatch(/^Tokens per second \(tokens\/s/);
    expect(messages.description).toContain("throughput rate");
    expect(messages.description).toContain("measurement window");
    expect(messages.sections?.whatItIs.body).toMatch(
      /^Tokens per second \(tokens\/s/,
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("token");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "tokenizer",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "different token counts",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "batching",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "60 tokens per second",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "time to first token",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).not.toMatch(
      /leaderboard|benchmark suite|artificial analysis/i,
    );
  });

  test("page renders throughput explainer prose without reader-shortcut copy", async () => {
    const page = await loadGlossaryPage("tokens-per-second");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.tokens-per-second");

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
    expectHtmlToContainProse(html, "Tokens per second");
    expectHtmlToContainProse(html, "tokenizer");
    expectHtmlToContainProse(html, "time to first token");
    expectHtmlToContainProse(html, "inter-token latency");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});
