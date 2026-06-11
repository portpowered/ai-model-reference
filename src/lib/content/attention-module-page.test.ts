import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { ATTENTION_MODULE_PAGE_DIR } from "@/lib/content/content-paths";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = ATTENTION_MODULE_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const pageMdxPath = join(pageDir, "page.mdx");

const FORBIDDEN_META_TERMS = [
  "Phase 1",
  "Phase 2",
  "Phase 3",
  "bridge page",
  "batch",
  "factory",
  "convergence",
  "roadmap",
];

describe("attention module variant hub messages", () => {
  test("uses folded openingSummary without legacy bridge or split lead keys", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.callouts).toBeUndefined();

    const serialized = JSON.stringify(messages);
    for (const term of FORBIDDEN_META_TERMS) {
      expect(serialized).not.toContain(term);
    }
  });
});

describe("attention module variant hub page", () => {
  test("page.mdx omits duplicate body title and phase bridge callout", () => {
    const template = readFileSync(pageMdxPath, "utf8");

    expect(template).toContain("<FoldedSummary />");
    expect(template).not.toContain('<T k="title" />');
    expect(template).not.toContain('<T k="problemStatement" />');
    expect(template).not.toContain('<T k="coreIdea" />');
    expect(template).not.toContain("phase1Bridge");
    expect(template).not.toContain("<Callout");
  });

  test("compiles MDX with opening summary, variant links, and registry chrome", async () => {
    const page = await loadModulePage("attention");

    expect(page.frontmatter.registryId).toBe("module.attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="folded-summary"');
    expect(html).toContain('data-folded-summary="true"');
    expect(html).toContain("scores how much each position should read");
    expect(html).not.toContain("Phase 1 bridge page");
    expect(html).not.toContain("roadmap");
    expect(html).toContain('data-registry-id="module.attention"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('data-testid="tag-pill-list"');
  });
});
