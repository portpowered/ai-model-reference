import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsAutoLinkedDescription } from "@/features/docs/components/DocsAutoLinkedDescription";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import type { LoadedGlossaryPage } from "@/lib/content/glossary-page-load";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

/** Renders glossary docs shell markup matching production auto-linked description wiring. */
export function renderGlossaryDocsShell(
  loadedPage: LoadedGlossaryPage,
  options?: { articleChildren?: ReactNode; locale?: SiteLocale },
): string {
  return renderToStaticMarkup(
    createElement(
      ModulePageProviders,
      {
        messages: loadedPage.messages,
        assets: loadedPage.assets,
        locale: options?.locale ?? defaultLocale,
      },
      createElement("div", null, [
        createElement(DocsTitle, { key: "title" }, loadedPage.messages.title),
        createElement(
          DocsDescription,
          { key: "description" },
          createElement(DocsAutoLinkedDescription, {
            text: loadedPage.messages.description,
          }),
        ),
        createElement(
          "article",
          {
            key: "article",
            "data-registry-id": loadedPage.frontmatter.registryId,
          },
          options?.articleChildren ?? loadedPage.content,
        ),
      ]),
    ),
  );
}
