import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsAutoLinkedDescription } from "@/features/docs/components/DocsAutoLinkedDescription";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import type { LoadedGlossaryPage } from "@/lib/content/glossary-page-load";

/** Renders glossary docs shell markup matching production auto-linked description wiring. */
export function renderGlossaryDocsShell(
  loadedPage: LoadedGlossaryPage,
  options?: { articleChildren?: ReactNode },
): string {
  return renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(DocsTitle, null, loadedPage.messages.title),
      createElement(
        DocsDescription,
        null,
        createElement(DocsAutoLinkedDescription, {
          text: loadedPage.messages.description,
        }),
      ),
      createElement(
        "article",
        { "data-registry-id": loadedPage.frontmatter.registryId },
        createElement(ModulePageProviders, {
          messages: loadedPage.messages,
          assets: loadedPage.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: options?.articleChildren ?? loadedPage.content,
        }),
      ),
    ),
  );
}
