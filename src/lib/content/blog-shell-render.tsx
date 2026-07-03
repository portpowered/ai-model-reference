import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import type { LoadedBlogPost } from "@/lib/content/blog-page-load";

/** Renders blog post shell markup for layout and viewport probes. */
export function renderBlogPostShell(loadedPost: LoadedBlogPost): string {
  return renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(DocsTitle, null, loadedPost.messages.title),
      createElement(DocsDescription, null, loadedPost.messages.description),
      createElement(ModulePageProviders, {
        messages: loadedPost.messages,
        assets: loadedPost.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: createElement(
          "article",
          { "data-blog-slug": loadedPost.slug },
          loadedPost.content,
        ),
      }),
    ),
  );
}
