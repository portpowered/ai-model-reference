import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPED_QUERY_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import {
  expectModuleSingleTagPillList,
  expectModuleTagPillListOnlyInTagsSection,
} from "@/lib/content/module-test-helpers";
import { formatTagLabel } from "@/lib/content/tags";
import { assertGroupedQueryAttentionChromeConvergence } from "@/lib/verify/grouped-query-attention-module-convergence";

describe("grouped-query-attention module tag deduplication", () => {
  test("canonical module template renders TagPillList only in the tags section", () => {
    const template = readFileSync(
      join(process.cwd(), "docs/templates/module.mdx"),
      "utf8",
    );

    const tagPillMatches = template.match(/<TagPillList\b/g) ?? [];
    expect(tagPillMatches.length).toBe(1);
    expect(template).toContain('<Section id="tags"');
    expect(template).not.toMatch(
      /<TagPillList[^>]*\/>\s*\n\s*<ModuleAtAGlance/,
    );
    expect(template).not.toContain("<ModuleMetadataCard");
  });

  test("published GQA page renders TagPillList only in the tags section", () => {
    const raw = readFileSync(
      join(GROUPED_QUERY_ATTENTION_PAGE_DIR, "page.mdx"),
      "utf8",
    );

    const tagPillMatches = raw.match(/<TagPillList\b/g) ?? [];
    expect(tagPillMatches.length).toBe(1);
    expect(raw).toContain('<Section id="tags"');
    expect(raw).not.toMatch(/<TagPillList[^>]*\/>\s*\n\s*<ModuleAtAGlance/);
    expect(raw).not.toContain("<ModuleMetadataCard");
  });

  test("/docs/modules/grouped-query-attention renders one tag pill list with attention and kv-cache links", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: "grouped-query-attention",
    });

    const html = renderModuleDocsShell(loadedPage);

    expectModuleTagPillListOnlyInTagsSection(html);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain(formatTagLabel("attention"));
    expect(html).toContain(formatTagLabel("kv-cache"));
    expect(loadedPage.messages.sections?.tags?.title ?? "Tags").toBeTruthy();
    expect(html).toContain(loadedPage.messages.sections?.tags?.title ?? "Tags");
    expect(assertGroupedQueryAttentionChromeConvergence(html)).toBeNull();
    expectModuleSingleTagPillList(html);
  });
});
