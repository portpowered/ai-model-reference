import type { ReactNode } from "react";

export function DocsFoldedSummary({ children }: { children: ReactNode }) {
  return (
    <section
      id="opening-summary"
      data-opening-summary="folded"
      data-testid="folded-summary"
      className="mb-6 rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm leading-7 text-foreground sm:px-5"
      aria-label="Opening summary"
    >
      <p>{children}</p>
    </section>
  );
}
