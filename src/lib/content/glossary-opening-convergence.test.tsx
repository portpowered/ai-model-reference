import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getGlossaryDocsRoot } from "@/lib/content/content-paths";
import { listPublishedGlossaryPages } from "@/lib/content/glossary";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import {
  expectGlossaryOmitsOpeningSummary,
  expectGlossaryOpeningSummaryMessage,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

describe("glossary opening convergence", () => {
  test("canonical glossary template omits GlossaryOpening and legacy blocks", () => {
    const template = readFileSync(
      join(process.cwd(), "docs/templates/glossary.mdx"),
      "utf8",
    );

    expect(template).not.toContain("<GlossaryOpening />");
    expect(template).not.toContain('<T k="problemStatement" />');
    expect(template).not.toContain('<T k="coreIdea" />');
  });

  test("published glossary pages omit GlossaryOpening and legacy blocks", async () => {
    const pages = await listPublishedGlossaryPages();
    const root = getGlossaryDocsRoot();

    for (const page of pages) {
      const raw = readFileSync(join(root, page.slug, "page.mdx"), "utf8");
      expect(raw).not.toContain("<GlossaryOpening />");
      expect(raw).not.toContain('<T k="problemStatement" />');
      expect(raw).not.toContain('<T k="coreIdea" />');
    }
  });

  test(
    "published glossary pages keep openingSummary in messages but omit it in shell render",
    async () => {
      const pages = await listPublishedGlossaryPages();

      for (const page of pages) {
        const loadedPage = await loadLocalDocsPage({
          section: "glossary",
          slug: page.slug,
        });
        expectGlossaryOpeningSummaryMessage(loadedPage.messages);

        const html = renderGlossaryDocsShell(loadedPage);
        expectGlossaryOmitsOpeningSummary(html);
      }
    },
    { timeout: 30_000 },
  );
});
