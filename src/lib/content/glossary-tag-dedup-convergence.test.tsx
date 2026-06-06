import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getGlossaryDocsRoot } from "@/lib/content/content-paths";
import { listPublishedGlossaryPages } from "@/lib/content/glossary";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import { expectGlossarySingleTagPillList } from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

describe("glossary tag deduplication convergence", () => {
  test("canonical glossary template renders TagPillList only in the tags section", () => {
    const template = readFileSync(
      join(process.cwd(), "docs/templates/glossary.mdx"),
      "utf8",
    );

    const tagPillMatches = template.match(/<TagPillList\b/g) ?? [];
    expect(tagPillMatches.length).toBe(1);
    expect(template).toContain('<Section id="tags"');
    expect(template).not.toMatch(/<GlossaryOpening \/>\s*\n\s*<TagPillList\b/);
  });

  test("published glossary pages render TagPillList only in the tags section", async () => {
    const pages = await listPublishedGlossaryPages();
    const root = getGlossaryDocsRoot();

    for (const page of pages) {
      const raw = readFileSync(join(root, page.slug, "page.mdx"), "utf8");
      const tagPillMatches = raw.match(/<TagPillList\b/g) ?? [];
      expect(tagPillMatches.length).toBe(1);
      expect(raw).toContain('<Section id="tags"');
      expect(raw).not.toMatch(/<GlossaryOpening \/>\s*\n\s*<TagPillList\b/);
    }
  });

  test("/docs/glossary/token renders exactly one tag pill list with accessible labels", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });

    const html = renderGlossaryDocsShell(loadedPage);
    expectGlossarySingleTagPillList(html);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("Attention");
    expect(html).toContain(loadedPage.messages.sections?.tags?.title ?? "Tags");
  });
});
