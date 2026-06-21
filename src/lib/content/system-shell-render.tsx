import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FoldedOpeningSummary } from "@/features/docs/components/FoldedOpeningSummary";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import type { LoadedSystemPage } from "@/lib/content/system-page-load";

/** Renders system docs shell markup matching production title, description, and folded-summary wiring. */
export function renderSystemDocsShell(
  loadedPage: LoadedSystemPage,
  options?: {
    articleChildren?: ReactNode;
    openingSummaryLabel?: string;
  },
): string {
  const articleChildren =
    options && "articleChildren" in options
      ? options.articleChildren
      : loadedPage.content;
  const openingSummaryLabel = options?.openingSummaryLabel ?? "Opening summary";

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
          key: "opening-summary",
          label: openingSummaryLabel,
          summary: loadedPage.messages.openingSummary,
        }),
        createElement(
          "article",
          {
            key: "article",
            "data-registry-id": loadedPage.frontmatter.registryId,
          },
          articleChildren,
        ),
      ]),
    ),
  );
}
