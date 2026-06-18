export const SIDEBAR_GROUPING_PRECEDENCE = [
  "derived-taxonomy",
  "editorial-sidebar-grouping",
] as const;

export const SIDEBAR_GROUP_LABELS = {
  glossary: {
    "model-taxonomy": "Model Taxonomy",
    "sequence-and-attention": "Sequence And Attention",
    "math-and-training": "Math And Training",
    "generation-and-diffusion": "Generation And Diffusion",
  },
  concepts: {
    "long-context": "Long Context",
    inference: "Inference",
    architecture: "Architecture",
    "reference-samples": "Reference Samples",
  },
  modules: {
    "attention-foundations": "Attention Foundations",
    "attention-variants": "Attention Variants",
    "feed-forward-and-activation": "Feed-Forward And Activation",
    normalization: "Normalization",
    "positional-and-sequence-encoding": "Positional And Sequence Encoding",
  },
  training: {
    "post-training": "Post-Training",
    distillation: "Distillation",
    optimization: "Optimization",
  },
  systems: {
    memory: "Memory",
    routing: "Routing",
  },
} as const;

export type SidebarGroupingSection = keyof typeof SIDEBAR_GROUP_LABELS;

type SidebarGroupLabelMap = typeof SIDEBAR_GROUP_LABELS;

export type SidebarGroupIdBySection = {
  [Section in SidebarGroupingSection]: keyof SidebarGroupLabelMap[Section];
};

export type SidebarGrouping = Partial<{
  [Section in SidebarGroupingSection]: SidebarGroupIdBySection[Section];
}>;

export const SIDEBAR_GROUPING_SECTIONS_BY_KIND = {
  concept: ["glossary", "concepts"],
  module: ["modules"],
  "training-regime": ["training"],
  system: ["systems"],
} as const;

export type SidebarGroupingKind =
  keyof typeof SIDEBAR_GROUPING_SECTIONS_BY_KIND;

export type SidebarGroupingValidationIssue = {
  path: [section: SidebarGroupingSection | string];
  message: string;
};

export function getSidebarGroupingSectionsForKind(
  kind: SidebarGroupingKind,
): readonly SidebarGroupingSection[] {
  return SIDEBAR_GROUPING_SECTIONS_BY_KIND[kind];
}

export function getSidebarGroupIdsForSection<
  Section extends SidebarGroupingSection,
>(section: Section): readonly SidebarGroupIdBySection[Section][] {
  return Object.keys(
    SIDEBAR_GROUP_LABELS[section],
  ) as SidebarGroupIdBySection[Section][];
}

export function isSidebarGroupingSection(
  value: string,
): value is SidebarGroupingSection {
  return value in SIDEBAR_GROUP_LABELS;
}

export function validateSidebarGroupingForRecord(
  kind: SidebarGroupingKind,
  recordId: string,
  sidebarGrouping: SidebarGrouping | undefined,
): SidebarGroupingValidationIssue[] {
  if (!sidebarGrouping) {
    return [];
  }

  const issues: SidebarGroupingValidationIssue[] = [];
  const allowedSections = new Set(getSidebarGroupingSectionsForKind(kind));

  for (const [section, rawValue] of Object.entries(sidebarGrouping)) {
    if (typeof rawValue !== "string") {
      issues.push({
        path: [section],
        message: `Record ${recordId} defines malformed sidebarGrouping.${section}; expected a string subgroup id.`,
      });
      continue;
    }

    if (!isSidebarGroupingSection(section)) {
      issues.push({
        path: [section],
        message: `Record ${recordId} defines unsupported sidebarGrouping section "${section}".`,
      });
      continue;
    }

    if (!allowedSections.has(section)) {
      issues.push({
        path: [section],
        message: `Record ${recordId} cannot define sidebarGrouping.${section}; ${kind} records only support ${Array.from(
          allowedSections,
        ).join(", ")} subgroup metadata.`,
      });
      continue;
    }

    const allowedValues = getSidebarGroupIdsForSection(section);
    if (!allowedValues.includes(rawValue as never)) {
      issues.push({
        path: [section],
        message: `Record ${recordId} defines unsupported sidebarGrouping.${section} value "${rawValue}". Allowed values: ${allowedValues.join(", ")}.`,
      });
    }
  }

  return issues;
}
