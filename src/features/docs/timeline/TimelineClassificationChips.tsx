"use client";

import { FilterChipNav } from "@/features/docs/components/FilterChipNav";
import type { OntologyTimelineClassificationSlice } from "@/lib/content/ontology-timeline";

type TimelineClassificationChipsProps = {
  basePath: string;
  chips: readonly OntologyTimelineClassificationSlice[];
  labels: {
    navigation: string;
    eventCount: string;
  };
  onSelectClassification?: (classification: string) => void;
};

export function TimelineClassificationChips({
  basePath,
  chips,
  labels,
  onSelectClassification,
}: TimelineClassificationChipsProps) {
  return (
    <FilterChipNav
      className="mt-6"
      items={chips.map((chip) => ({
        id: chip.classificationId,
        href: `${basePath}?classification=${encodeURIComponent(chip.slug)}`,
        label: chip.title,
        active: chip.active,
        ariaCurrent: chip.active ? "page" : undefined,
        count: chip.eventCount,
        onClick: () => onSelectClassification?.(chip.slug),
      }))}
      labels={{
        navigation: labels.navigation,
        count: labels.eventCount,
      }}
    />
  );
}
