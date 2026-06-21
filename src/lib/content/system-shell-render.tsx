import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { DocsOpeningSummary } from "@/features/docs/components/DocsOpeningSummary";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import type { LoadedSystemPage } from "@/lib/content/system-page-load";

/** Renders system docs shell markup matching production title, description, and folded-summary wiring. */
export async function renderSystemDocsShell(
  loadedPage: LoadedSystemPage,
): Promise<string> {
  const stream = await renderToReadableStream(
    createElement(
      "div",
      null,
      createElement(DocsTitle, null, loadedPage.messages.title),
      createElement(DocsDescription, null, loadedPage.messages.description),
      loadedPage.messages.openingSummary
        ? createElement(DocsOpeningSummary, {
            text: loadedPage.messages.openingSummary,
          })
        : null,
      createElement(ModulePageProviders, {
        messages: loadedPage.messages,
        assets: loadedPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: createElement(
          "div",
          null,
          createElement(
            "article",
            { "data-registry-id": loadedPage.frontmatter.registryId },
            loadedPage.content,
          ),
        ),
      }),
    ),
  );
  await stream.allReady;
  return await new Response(stream).text();
}
