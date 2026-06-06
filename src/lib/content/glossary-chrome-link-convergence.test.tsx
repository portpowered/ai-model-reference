import { describe, expect, test } from "bun:test";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import { expectGlossaryChromeLinksOmitUnderline } from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

describe("glossary chrome link convergence", () => {
  test("/docs/glossary/token tag and related-doc chrome links omit underline utilities", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });
    const html = renderGlossaryDocsShell(loadedPage);

    expectGlossaryChromeLinksOmitUnderline(html);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain("embeddings");
  });
});
