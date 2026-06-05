"use client";

import { T } from "@/features/docs/components/T";

export function GlossaryOpening() {
  return (
    <p className="text-muted-foreground" data-testid="glossary-opening">
      <T k="openingSummary" />
    </p>
  );
}
