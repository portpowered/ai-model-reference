"use client";

import Link from "next/link";
import { SearchTrigger } from "@/features/docs/search/SearchTrigger";
import type { UiMessages } from "@/lib/content/ui-messages.types";

type GlossaryEmptyStateProps = {
  messages: UiMessages;
};

export function GlossaryEmptyState({ messages }: GlossaryEmptyStateProps) {
  const { glossaryIndex } = messages;

  return (
    <output className="mt-8 block rounded-lg border border-border bg-card/40 p-6">
      <h2 className="font-serif text-lg font-semibold text-foreground">
        {glossaryIndex.emptyTitle}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {glossaryIndex.emptyDescription}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-ring hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {glossaryIndex.emptyHomeLink}
        </Link>
        <SearchTrigger messages={messages} />
      </div>
    </output>
  );
}
