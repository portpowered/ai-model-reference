import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import {
  expectGlossaryBodyOmitsShellDescription,
  expectGlossaryShellDescriptionAutoLink,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

describe("glossary shell description auto-link convergence", () => {
  test("/docs/glossary/embedding shell description links recognizable registry phrases", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "embedding",
    });
    const html = renderGlossaryDocsShell(loadedPage);
    const articleHtml = html.slice(html.indexOf("<article"));

    expectHtmlToContainProse(
      html,
      "A dense vector that represents a token or other discrete item",
    );
    expectGlossaryShellDescriptionAutoLink(html, {
      href: "/docs/glossary/vector",
      phrase: "dense vector",
    });
    expectGlossaryBodyOmitsShellDescription(
      articleHtml,
      loadedPage.messages.description,
    );
  });

  test("ambiguous phrases in shell descriptions stay plain text", () => {
    const html = renderToStaticMarkup(
      createElement(ProseAutoLinkText, {
        text: "Unknown phraseology without registry matches.",
      }),
    );

    expect(html).not.toContain("data-prose-auto-link");
    expect(html).toContain("Unknown phraseology without registry matches.");
  });
});
