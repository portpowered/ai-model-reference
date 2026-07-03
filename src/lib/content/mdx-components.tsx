import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Callout } from "@/features/docs/components/Callout";
import { CitationList } from "@/features/docs/components/CitationList";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { DocsPre } from "@/features/docs/components/DocsCodeBlock";
import { LocalizedLinkList } from "@/features/docs/components/LocalizedLinkList";
import { BlockMath, InlineMath } from "@/features/docs/components/Math";
import { PageAsset } from "@/features/docs/components/PageAsset";
import { PageMathFormula } from "@/features/docs/components/PageMathFormula";
import { RegistryAssociatedRecords } from "@/features/docs/components/RegistryAssociatedRecords";
import { RegistryDeepLinkList } from "@/features/docs/components/RegistryDeepLinkList";
import { RegistryLinkList } from "@/features/docs/components/RegistryLinkList";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { Section } from "@/features/docs/components/Section";
import { T } from "@/features/docs/components/T";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { GenerationEvolutionBlogVisual } from "@/features/generation-evolution/GenerationEvolutionBlogVisual";
import { GenerationEvolutionTimeline } from "@/features/generation-evolution/GenerationEvolutionTimeline";
import { ConceptMap } from "@/features/models/components/ConceptMap";
import { ModelArchitectureGraph } from "@/features/models/components/ModelArchitectureGraph";
import { ModelAtAGlance } from "@/features/models/components/ModelAtAGlance";
import { ModelModuleList } from "@/features/models/components/ModelModuleList";
import { ModelsUsingModule } from "@/features/models/components/ModelsUsingModule";
import { ModelTrainingSummary } from "@/features/models/components/ModelTrainingSummary";
import { ModuleAtAGlance } from "@/features/models/components/ModuleAtAGlance";
import {
  ModuleAttentionMhaMqaSchemaComparison,
  ModuleAttentionSchema,
  ModuleAttentionSchemaComparison,
} from "@/features/models/components/ModuleAttentionSchemaComparison";
import { ModuleChart } from "@/features/models/components/ModuleChart";
import { ModuleComparisonTable } from "@/features/models/components/ModuleComparisonTable";
import { ModuleGraph } from "@/features/models/components/ModuleGraph";
import { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";
import { PaperAtAGlance } from "@/features/models/components/PaperAtAGlance";
import { PaperContributionGraph } from "@/features/models/components/PaperContributionGraph";
import { SystemAtAGlance } from "@/features/models/components/SystemAtAGlance";
import { SystemFlowGraph } from "@/features/models/components/SystemFlowGraph";
import { TrainingRegimeAtAGlance } from "@/features/models/components/TrainingRegimeAtAGlance";
import { TrainingRegimeFlow } from "@/features/models/components/TrainingRegimeFlow";

export const moduleMdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  pre: DocsPre,
  BlockMath,
  InlineMath,
  Callout,
  CitationList,
  DerivedRelatedDocs,
  LocalizedLinkList,
  PageAsset,
  RelatedDocs,
  RegistryAssociatedRecords,
  RegistryDeepLinkList,
  RegistryLinkList,
  Section,
  T,
  TagPillList,
  ModuleComparisonTable,
  ModuleChart,
  ModuleAttentionMhaMqaSchemaComparison,
  ModuleAttentionSchema,
  ModuleAttentionSchemaComparison,
  ConceptMap,
  ModelArchitectureGraph,
  ModelAtAGlance,
  ModelModuleList,
  ModelTrainingSummary,
  ModuleGraph,
  ModuleMetadataCard,
  ModuleAtAGlance,
  ModelsUsingModule,
  PaperAtAGlance,
  PaperContributionGraph,
  PageMathFormula,
  SystemAtAGlance,
  SystemFlowGraph,
  TrainingRegimeAtAGlance,
  TrainingRegimeFlow,
  GenerationEvolutionBlogVisual,
  GenerationEvolutionTimeline,
};
