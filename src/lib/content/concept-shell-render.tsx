import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FoldedOpeningSummary } from "@/features/docs/components/FoldedOpeningSummary";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import type { LoadedConceptPage } from "@/lib/content/concept-page-load";

/** Renders concept docs shell markup matching production title, description, and folded-summary wiring. */
export function renderConceptDocsShell(
  loadedPage: LoadedConceptPage,
  options?: { articleChildren?: ReactNode },
): string {
  return renderToStaticMarkup(
    createElement(
      ModulePageProviders,
      {
        messages: loadedPage.messages,
        assets: loadedPage.assets,
      },
      createElement("div", null, [
        createElement(DocsTitle, { key: "title" }, loadedPage.messages.title),
        createElement(
          DocsDescription,
          { key: "description" },
          loadedPage.messages.description,
        ),
        createElement(FoldedOpeningSummary, {
          key: "summary",
          label: "Summary",
          summary: loadedPage.messages.openingSummary,
        }),
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
