"use client";

export function FoldedOpeningSummary({ summary }: { summary?: string }) {
  if (!summary) {
    return null;
  }

  return (
    <details
      className="mb-6 rounded-lg border border-border bg-card/60 p-4"
      data-testid="folded-opening-summary"
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
        Opening summary
      </summary>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary}</p>
    </details>
  );
}
