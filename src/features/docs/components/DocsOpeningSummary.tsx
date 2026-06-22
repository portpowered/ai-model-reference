"use client";

import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";

export function DocsOpeningSummary({ text }: { text: string }) {
  if (text.trim().length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Opening summary"
      data-opening-summary="folded"
      className="rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm leading-7 text-foreground sm:px-5"
    >
      <p data-testid="folded-summary">
        <ProseAutoLinkText text={text} />
      </p>
    </section>
  );
}
