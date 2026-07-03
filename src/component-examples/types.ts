import type { ReactNode } from "react";

export const REQUIRED_COMPONENT_NAMES = [
  "Callout",
  "Section",
  "T",
  "TagPillList",
  "DerivedRelatedDocs",
  "SearchInlineResultItem",
  "SearchResultListItem",
  "SearchResultMetaDetails",
  "GenerationEvolutionTimeline",
  "TrainingSignalStackedChart",
] as const;

export type ComponentExampleName = (typeof REQUIRED_COMPONENT_NAMES)[number];

export type ComponentExampleContext = {
  pageMessages: import("@/lib/content/schemas").PageMessages;
  uiMessages: import("@/lib/content/ui-messages.types").UiMessages;
  metaByUrl: import("@/features/docs/search/search-result-meta-client").SearchResultMetaRecord;
  sampleModuleUrl: string;
};

export type ComponentExampleDefinition = {
  id: string;
  componentName: ComponentExampleName;
  variantLabel: string;
  description?: string;
  render: (context: ComponentExampleContext) => ReactNode;
};
