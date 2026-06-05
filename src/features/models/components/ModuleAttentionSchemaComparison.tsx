"use client";

import { TBlockMath } from "@/features/docs/components/TBlockMath";

export function ModuleAttentionSchemaComparison() {
  return (
    <div
      className="not-prose my-4 flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-4"
      data-attention-schema-comparison="true"
    >
      <TBlockMath
        labelKey="math.mhaSchema.label"
        formulaKey="math.mhaSchema.formula"
      />
      <TBlockMath
        labelKey="math.gqaSchema.label"
        formulaKey="math.gqaSchema.formula"
      />
    </div>
  );
}
