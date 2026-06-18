import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPED_QUERY_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import {
  expectGlossaryBodyOmitsTitleHeading,
  stripHtmlTags,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import {
  assertGroupedQueryAttentionTitleConvergence,
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
} from "@/lib/verify/grouped-query-attention-module-convergence";

function countH1BlocksContaining(html: string, text: string): number {
  const h1Pattern = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;
  const blocks = html.match(h1Pattern) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

function extractModuleArticleHtml(html: string, registryId: string): string {
  const escapedRegistryId = registryId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<article[^>]*data-registry-id="${escapedRegistryId}"[^>]*>[\\s\\S]*?</article>`,
    ),
  );
  return match?.[0] ?? "";
}

describe("grouped-query-attention module shell chrome", () => {
  test("canonical module template omits in-body title heading and pre-repair opening chrome", () => {
    const template = readFileSync(
      join(process.cwd(), "docs/templates/module.mdx"),
      "utf8",
    );

    expect(template).not.toContain('# <T k="title" />');
    expect(template).not.toContain("<ModuleMetadataCard");
    expect(template).not.toMatch(
      /<TagPillList[^>]*\/>\s*\n\s*<ModuleAtAGlance/,
    );
  });

  test("published GQA page omits in-body title heading and pre-repair opening chrome", () => {
    const raw = readFileSync(
      join(GROUPED_QUERY_ATTENTION_PAGE_DIR, "page.mdx"),
      "utf8",
    );

    expect(raw).not.toContain('# <T k="title" />');
    expect(raw).not.toContain("<ModuleMetadataCard");
    expect(raw).not.toMatch(/<TagPillList[^>]*\/>\s*\n\s*<ModuleAtAGlance/);
  });

  test("/docs/modules/grouped-query-attention renders one shell title and At a glance after opening copy", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: "grouped-query-attention",
    });

    const html = renderModuleDocsShell(loadedPage);
    const articleHtml = extractModuleArticleHtml(
      html,
      "module.grouped-query-attention",
    );

    expect(
      countH1BlocksContaining(html, GROUPED_QUERY_ATTENTION_MODULE_TITLE),
    ).toBe(1);
    expectGlossaryBodyOmitsTitleHeading(articleHtml, loadedPage.messages.title);
    expect(html).not.toContain('aria-label="Module metadata"');
    expect(html).not.toContain('data-testid="folded-summary"');
    expect(html).toContain('aria-label="At a glance"');
    expect(assertGroupedQueryAttentionTitleConvergence(html)).toBeNull();

    const atAGlanceIndex = html.indexOf('aria-label="At a glance"');
    const whatItIsIndex = html.indexOf('id="what-it-is"');

    const plainHtml = stripHtmlTags(html);
    expect(plainHtml).toContain(
      "Grouped-query attention (GQA) is an attention variant",
    );
    expect(atAGlanceIndex).toBeGreaterThanOrEqual(0);
    expect(whatItIsIndex).toBeGreaterThan(atAGlanceIndex);
  });
});
