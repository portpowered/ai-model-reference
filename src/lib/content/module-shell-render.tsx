import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FoldedSummary } from "@/features/docs/components/FoldedSummary";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import type { LoadedModulePage } from "@/lib/content/module-page-load";

/** Renders module docs shell markup matching production DocsTitle and description wiring. */
export function renderModuleDocsShell(
  loadedPage: LoadedModulePage,
  options?: { articleChildren?: ReactNode },
): string {
  return renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(DocsTitle, null, loadedPage.messages.title),
      createElement(DocsDescription, null, loadedPage.messages.description),
      createElement(ModulePageProviders, {
        messages: loadedPage.messages,
        assets: loadedPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: createElement(
          "div",
          null,
          createElement(FoldedSummary),
          createElement(
            "article",
            { "data-registry-id": loadedPage.frontmatter.registryId },
            options?.articleChildren ?? loadedPage.content,
          ),
        ),
      }),
    ),
  );
}
