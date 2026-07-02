import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { BlogRelatedDocs } from "@/features/blog/components/BlogRelatedDocs";
import { Callout } from "@/features/docs/components/Callout";
import { CitationList } from "@/features/docs/components/CitationList";
import { T } from "@/features/docs/components/T";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { TrainingSignalStackedChartFromDefault } from "@/features/graphs/training-signal/TrainingSignalStackedChartFromDefault";

export const blogMdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  BlogRelatedDocs,
  Callout,
  CitationList,
  T,
  TagPillList,
  TrainingSignalStackedChartFromDefault,
};
