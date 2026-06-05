import { describe, expect, test } from "bun:test";
import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { expectGlossaryChromeLinksOmitUnderline } from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

async function renderTokenGlossaryChromeShell(): Promise<string> {
  const loadedPage = await loadLocalDocsPage({
    section: "glossary",
    slug: "token",
  });

  return renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(DocsTitle, null, loadedPage.messages.title),
      createElement(DocsDescription, null, loadedPage.messages.description),
      createElement(
        "article",
        { "data-registry-id": loadedPage.frontmatter.registryId },
        createElement(ModulePageProviders, {
          messages: loadedPage.messages,
          assets: loadedPage.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: loadedPage.content,
        }),
      ),
    ),
  );
}

describe("glossary chrome link convergence", () => {
  test("/docs/glossary/token tag and related-doc chrome links omit underline utilities", async () => {
    const html = await renderTokenGlossaryChromeShell();

    expectGlossaryChromeLinksOmitUnderline(html);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain("embeddings");
  });
});
