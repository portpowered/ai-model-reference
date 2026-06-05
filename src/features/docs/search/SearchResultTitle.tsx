"use client";

import { createMarkdownRenderer } from "fumadocs-core/content/md";
import type { ComponentProps } from "react";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import { searchResultTitleMarkClassName } from "./search-result-row-classes";
import { resolveSearchResultTitleContent } from "./search-result-title-content";

const titleMarkdownRenderer = createMarkdownRenderer({
  remarkRehypeOptions: { allowDangerousHtml: true },
  rehypePlugins: [rehypeRaw],
});

const titleMarkdownComponents = {
  mark(props: ComponentProps<"mark">) {
    return (
      <mark
        {...props}
        className={cn(searchResultTitleMarkClassName, props.className)}
        data-testid="search-result-title-mark"
      />
    );
  },
  p(props: ComponentProps<"p">) {
    return <span {...props} className={cn("inline", props.className)} />;
  },
};

export type SearchResultTitleProps = {
  content: string;
  query: string;
  className?: string;
};

/** Renders a search result title with readable query-match highlighting. */
export function SearchResultTitle({
  content,
  query,
  className,
}: SearchResultTitleProps) {
  const highlighted = resolveSearchResultTitleContent(content, query);

  return (
    <span className={cn("min-w-0 font-medium", className)}>
      <titleMarkdownRenderer.Markdown components={titleMarkdownComponents}>
        {highlighted}
      </titleMarkdownRenderer.Markdown>
    </span>
  );
}
