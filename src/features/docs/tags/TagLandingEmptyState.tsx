"use client";

import Link from "next/link";
import { TagSearchHandoff } from "@/features/docs/tags/TagSearchHandoff";
import type { UiMessages } from "@/lib/content/ui-messages.types";

type TagLandingEmptyStateProps = {
  messages: UiMessages;
  tagSlug: string;
  searchQuery: string;
};

export function TagLandingEmptyState({
  messages,
  tagSlug,
  searchQuery,
}: TagLandingEmptyStateProps) {
  const { tagLanding } = messages;

  return (
    <output className="mt-8 block rounded-lg border border-border bg-card/40 p-6">
      <h2 className="font-serif text-lg font-semibold text-foreground">
        {tagLanding.emptyTitle}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {tagLanding.emptyDescription}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-ring hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tagLanding.emptyHomeLink}
        </Link>
        <Link
          href="/tags"
          className="inline-flex items-center rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-ring hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tagLanding.emptyTagsLink}
        </Link>
        <TagSearchHandoff
          messages={messages}
          tagSlug={tagSlug}
          searchQuery={searchQuery}
          label={tagLanding.searchHandoff}
        />
      </div>
    </output>
  );
}
