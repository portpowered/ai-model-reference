"use client";

import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { lookupMessage } from "@/lib/content/messages";

/** Renders the canonical folded opening summary from localized page messages. */
export function FoldedSummary() {
  const { messages, isDev } = usePageMessages();
  const result = lookupMessage(messages, "openingSummary");

  if (!result.ok) {
    if (isDev) {
      return (
        <MissingMessageKey messageKey="openingSummary" reason={result.reason} />
      );
    }
    return null;
  }

  return (
    <details
      className="my-4 rounded-md border border-border bg-muted/40 px-4 py-3"
      data-testid="folded-summary"
      data-folded-summary="true"
      data-opening-summary="folded"
    >
      <summary className="cursor-pointer text-sm font-medium text-foreground marker:content-none">
        Summary
      </summary>
      <div className="mt-2 text-sm text-muted-foreground">
        <ProseAutoLinkText text={result.value} />
      </div>
    </details>
  );
}
