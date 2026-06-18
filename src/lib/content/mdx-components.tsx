import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Callout } from "@/features/docs/components/Callout";
import { CitationList } from "@/features/docs/components/CitationList";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { DocsPre } from "@/features/docs/components/DocsCodeBlock";
import { FoldedSummary } from "@/features/docs/components/FoldedSummary";
import { LocalizedLinkList } from "@/features/docs/components/LocalizedLinkList";
import { BlockMath, InlineMath } from "@/features/docs/components/Math";
import { PageMathFormula } from "@/features/docs/components/PageMathFormula";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { Section } from "@/features/docs/components/Section";
import { T } from "@/features/docs/components/T";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { ConceptMap } from "@/features/models/components/ConceptMap";
import { ModelsUsingModule } from "@/features/models/components/ModelsUsingModule";
import { ModuleAtAGlance } from "@/features/models/components/ModuleAtAGlance";
import {
  ModuleAttentionMhaMqaSchemaComparison,
  ModuleAttentionSchema,
  ModuleAttentionSchemaComparison,
} from "@/features/models/components/ModuleAttentionSchemaComparison";
import { ModuleComparisonTable } from "@/features/models/components/ModuleComparisonTable";
import { ModuleGraph } from "@/features/models/components/ModuleGraph";
import { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";

export const moduleMdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  pre: DocsPre,
  BlockMath,
  InlineMath,
  Callout,
  CitationList,
  DerivedRelatedDocs,
  FoldedSummary,
  LocalizedLinkList,
  RelatedDocs,
  Section,
  T,
  TagPillList,
  ModuleComparisonTable,
  ModuleAttentionMhaMqaSchemaComparison,
  ModuleAttentionSchema,
  ModuleAttentionSchemaComparison,
  ConceptMap,
  ModuleGraph,
  ModuleMetadataCard,
  ModuleAtAGlance,
  ModelsUsingModule,
  PageMathFormula,
};
