import type { MDXComponents } from "mdx/types";
import { Callout } from "@/features/docs/components/Callout";
import { CitationList } from "@/features/docs/components/CitationList";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { Section } from "@/features/docs/components/Section";
import { T } from "@/features/docs/components/T";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { ConceptMap } from "@/features/models/components/ConceptMap";
import { ModelsUsingModule } from "@/features/models/components/ModelsUsingModule";
import { ModuleAtAGlance } from "@/features/models/components/ModuleAtAGlance";
import { ModuleComparisonTable } from "@/features/models/components/ModuleComparisonTable";
import { ModuleGraph } from "@/features/models/components/ModuleGraph";
import { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";

export const moduleMdxComponents: MDXComponents = {
  Callout,
  CitationList,
  DerivedRelatedDocs,
  RelatedDocs,
  Section,
  T,
  TagPillList,
  ModuleComparisonTable,
  ConceptMap,
  ModuleGraph,
  ModuleMetadataCard,
  ModuleAtAGlance,
  ModelsUsingModule,
};
