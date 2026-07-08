import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { BlogRelatedDocs } from "@/features/blog/components/BlogRelatedDocs";
import { Callout } from "@/features/docs/components/Callout";
import { CitationList } from "@/features/docs/components/CitationList";
import { T } from "@/features/docs/components/T";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { GenerationEvolutionBlogVisual } from "@/features/generation-evolution/GenerationEvolutionBlogVisual";
import { TrainingSignalStackedChartFromDefault } from "@/features/graphs/training-signal/TrainingSignalStackedChartFromDefault";
import { RooflineThroughputExplorerFromRegistry } from "@/features/roofline-throughput-explorer/RooflineThroughputExplorerFromRegistry";
import { TrainingSignalEvolutionBlogVisual } from "@/features/training-signal-evolution/TrainingSignalEvolutionBlogVisual";

export const blogMdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  BlogRelatedDocs,
  Callout,
  CitationList,
  GenerationEvolutionBlogVisual,
  RooflineThroughputExplorerFromRegistry,
  T,
  TagPillList,
  TrainingSignalEvolutionBlogVisual,
  TrainingSignalStackedChartFromDefault,
};
