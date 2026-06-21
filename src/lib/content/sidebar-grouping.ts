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
    pretraining: "Pretraining",
    alignment: "Alignment",
    "post-training": "Post-Training",
    distillation: "Distillation",
    optimization: "Optimization",
  },
  systems: {
    memory: "Memory",
    routing: "Routing",
    serving: "Serving",
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

type SidebarGroupingRecordByKind = {
  concept: ConceptsSidebarRecord;
  module: ModulesSidebarRecord;
  "training-regime": TrainingSidebarRecord;
  system: SystemsSidebarRecord;
};

type GlossarySidebarRecord = {
  primaryClassificationId?: string;
  secondaryClassificationIds?: readonly string[];
  sidebarGrouping?: SidebarGrouping;
};

type ConceptsSidebarRecord = GlossarySidebarRecord;

type ModulesSidebarRecord = {
  primaryClassificationId?: string;
  secondaryClassificationIds?: readonly string[];
  sidebarGrouping?: SidebarGrouping;
};

type TrainingSidebarRecord = {
  primaryClassificationId?: string;
  secondaryClassificationIds?: readonly string[];
  sidebarGrouping?: SidebarGrouping;
};

type SystemsSidebarRecord = {
  primaryClassificationId?: string;
  secondaryClassificationIds?: readonly string[];
  sidebarGrouping?: SidebarGrouping;
  systemType?: string;
};

export type SidebarGroupingSource =
  (typeof SIDEBAR_GROUPING_PRECEDENCE)[number];

export type SidebarGroupResolution<
  GroupId extends string = string,
  Source extends SidebarGroupingSource = SidebarGroupingSource,
> = {
  groupId: GroupId;
  source: Source;
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

export function getSidebarGroupLabel<Section extends SidebarGroupingSection>(
  section: Section,
  groupId: SidebarGroupIdBySection[Section],
): string {
  return SIDEBAR_GROUP_LABELS[section][groupId] as string;
}

function createSidebarGroupResolution<
  GroupId extends string,
  Source extends SidebarGroupingSource,
>(groupId: GroupId, source: Source): SidebarGroupResolution<GroupId, Source> {
  return {
    groupId,
    source,
  };
}

function getCanonicalClassificationMembership(
  record: Pick<
    | GlossarySidebarRecord
    | ConceptsSidebarRecord
    | ModulesSidebarRecord
    | TrainingSidebarRecord
    | SystemsSidebarRecord,
    "primaryClassificationId" | "secondaryClassificationIds"
  >,
): Set<string> {
  const membership = new Set<string>();

  for (const rawClassificationId of [
    record.primaryClassificationId,
    ...(record.secondaryClassificationIds ?? []),
  ]) {
    if (!rawClassificationId) {
      continue;
    }

    membership.add(rawClassificationId);
  }

  return membership;
}

function resolveOntologyModulesSidebarGroup(
  record: ModulesSidebarRecord,
):
  | SidebarGroupResolution<
      SidebarGroupIdBySection["modules"],
      "derived-taxonomy"
    >
  | undefined {
  const membership = getCanonicalClassificationMembership(record);
  if (membership.has("classification.module.normalization")) {
    return createSidebarGroupResolution("normalization", "derived-taxonomy");
  }

  if (membership.has("classification.module.positional-encoding")) {
    return createSidebarGroupResolution(
      "positional-and-sequence-encoding",
      "derived-taxonomy",
    );
  }

  if (
    membership.has("classification.module.feed-forward") ||
    membership.has("classification.module.activation")
  ) {
    return createSidebarGroupResolution(
      "feed-forward-and-activation",
      "derived-taxonomy",
    );
  }

  if (membership.has("classification.module.attention")) {
    return createSidebarGroupResolution(
      "attention-variants",
      "derived-taxonomy",
    );
  }

  return undefined;
}

function resolveEditorialModulesSidebarGroup(
  record: ModulesSidebarRecord,
):
  | SidebarGroupResolution<
      SidebarGroupIdBySection["modules"],
      "editorial-sidebar-grouping"
    >
  | undefined {
  const editorialGroup = record.sidebarGrouping?.modules;
  if (!editorialGroup) {
    return undefined;
  }

  return createSidebarGroupResolution(
    editorialGroup,
    "editorial-sidebar-grouping",
  );
}

function shouldUseEditorialModulesSidebarFallback(
  record: ModulesSidebarRecord,
  ontologyGroup: SidebarGroupResolution<
    SidebarGroupIdBySection["modules"],
    "derived-taxonomy"
  >,
): boolean {
  return (
    ontologyGroup.groupId === "attention-variants" &&
    record.primaryClassificationId === "classification.module.attention" &&
    record.sidebarGrouping?.modules === "attention-foundations"
  );
}

export function resolveModulesSidebarGroupWithSource(
  record: ModulesSidebarRecord,
): SidebarGroupResolution<SidebarGroupIdBySection["modules"]> | undefined {
  const ontologyGroup = resolveOntologyModulesSidebarGroup(record);
  if (
    ontologyGroup &&
    !shouldUseEditorialModulesSidebarFallback(record, ontologyGroup)
  ) {
    return ontologyGroup;
  }

  return resolveEditorialModulesSidebarGroup(record) ?? ontologyGroup;
}

function resolveOntologyTrainingSidebarGroup(
  record: TrainingSidebarRecord,
):
  | SidebarGroupResolution<
      SidebarGroupIdBySection["training"],
      "derived-taxonomy"
    >
  | undefined {
  const membership = getCanonicalClassificationMembership(record);
  if (membership.has("classification.training.alignment")) {
    return createSidebarGroupResolution("alignment", "derived-taxonomy");
  }

  return undefined;
}

export function resolveTrainingSidebarGroupWithSource(
  record: TrainingSidebarRecord,
): SidebarGroupResolution<SidebarGroupIdBySection["training"]> | undefined {
  const ontologyGroup = resolveOntologyTrainingSidebarGroup(record);
  if (ontologyGroup) {
    return ontologyGroup;
  }

  const editorialGroup = record.sidebarGrouping?.training;
  if (!editorialGroup) {
    return undefined;
  }

  return createSidebarGroupResolution(
    editorialGroup,
    "editorial-sidebar-grouping",
  );
}

function resolveOntologySystemsSidebarGroup(
  record: SystemsSidebarRecord,
):
  | SidebarGroupResolution<
      SidebarGroupIdBySection["systems"],
      "derived-taxonomy"
    >
  | undefined {
  const membership = getCanonicalClassificationMembership(record);
  if (membership.has("classification.system.routing")) {
    return createSidebarGroupResolution("routing", "derived-taxonomy");
  }

  if (record.systemType === "memory") {
    return createSidebarGroupResolution("memory", "derived-taxonomy");
  }

  if (record.systemType === "routing") {
    return createSidebarGroupResolution("routing", "derived-taxonomy");
  }

  if (record.systemType === "serving") {
    return createSidebarGroupResolution("serving", "derived-taxonomy");
  }

  return undefined;
}

export function resolveSystemsSidebarGroupWithSource(
  record: SystemsSidebarRecord,
): SidebarGroupResolution<SidebarGroupIdBySection["systems"]> | undefined {
  const ontologyGroup = resolveOntologySystemsSidebarGroup(record);
  if (ontologyGroup) {
    return ontologyGroup;
  }

  const editorialGroup = record.sidebarGrouping?.systems;
  if (!editorialGroup) {
    return undefined;
  }

  return createSidebarGroupResolution(
    editorialGroup,
    "editorial-sidebar-grouping",
  );
}

function resolveOntologyGlossarySidebarGroup(
  record: GlossarySidebarRecord,
):
  | SidebarGroupResolution<
      SidebarGroupIdBySection["glossary"],
      "derived-taxonomy"
    >
  | undefined {
  const membership = getCanonicalClassificationMembership(record);

  if (
    membership.has("classification.concept.math") ||
    membership.has("classification.concept.training") ||
    membership.has("classification.concept.evaluation") ||
    membership.has("classification.concept.architecture.activation")
  ) {
    return createSidebarGroupResolution(
      "math-and-training",
      "derived-taxonomy",
    );
  }

  return undefined;
}

function resolveEditorialGlossarySidebarGroup(
  record: GlossarySidebarRecord,
):
  | SidebarGroupResolution<
      SidebarGroupIdBySection["glossary"],
      "editorial-sidebar-grouping"
    >
  | undefined {
  const editorialGroup = record.sidebarGrouping?.glossary;
  if (editorialGroup) {
    return createSidebarGroupResolution(
      editorialGroup,
      "editorial-sidebar-grouping",
    );
  }

  return createSidebarGroupResolution(
    "model-taxonomy",
    "editorial-sidebar-grouping",
  );
}

export function resolveGlossarySidebarGroupWithSource(
  record: GlossarySidebarRecord,
): SidebarGroupResolution<SidebarGroupIdBySection["glossary"]> | undefined {
  return (
    resolveOntologyGlossarySidebarGroup(record) ??
    resolveEditorialGlossarySidebarGroup(record)
  );
}

function resolveOntologyConceptsSidebarGroup(
  record: ConceptsSidebarRecord,
):
  | SidebarGroupResolution<
      SidebarGroupIdBySection["concepts"],
      "derived-taxonomy"
    >
  | undefined {
  const membership = getCanonicalClassificationMembership(record);

  if (membership.has("classification.concept.inference")) {
    return createSidebarGroupResolution("inference", "derived-taxonomy");
  }

  if (
    membership.has("classification.concept.architecture") ||
    membership.has("classification.concept.architecture.activation")
  ) {
    return createSidebarGroupResolution("architecture", "derived-taxonomy");
  }

  return undefined;
}

function resolveEditorialConceptsSidebarGroup(
  record: ConceptsSidebarRecord,
):
  | SidebarGroupResolution<
      SidebarGroupIdBySection["concepts"],
      "editorial-sidebar-grouping"
    >
  | undefined {
  const editorialGroup = record.sidebarGrouping?.concepts;
  if (!editorialGroup) {
    return undefined;
  }

  return createSidebarGroupResolution(
    editorialGroup,
    "editorial-sidebar-grouping",
  );
}

export function resolveConceptsSidebarGroupWithSource(
  record: ConceptsSidebarRecord,
): SidebarGroupResolution<SidebarGroupIdBySection["concepts"]> | undefined {
  return (
    resolveOntologyConceptsSidebarGroup(record) ??
    resolveEditorialConceptsSidebarGroup(record)
  );
}

export function resolveGlossarySidebarGroup(
  record: GlossarySidebarRecord,
): SidebarGroupIdBySection["glossary"] | undefined {
  return resolveGlossarySidebarGroupWithSource(record)?.groupId;
}

export function resolveConceptsSidebarGroup(
  record: ConceptsSidebarRecord,
): SidebarGroupIdBySection["concepts"] | undefined {
  return resolveConceptsSidebarGroupWithSource(record)?.groupId;
}

export function resolveModulesSidebarGroup(
  record: ModulesSidebarRecord,
): SidebarGroupIdBySection["modules"] | undefined {
  return resolveModulesSidebarGroupWithSource(record)?.groupId;
}

export function resolveTrainingSidebarGroup(
  record: TrainingSidebarRecord,
): SidebarGroupIdBySection["training"] | undefined {
  return resolveTrainingSidebarGroupWithSource(record)?.groupId;
}

export function resolveSystemsSidebarGroup(
  record: SystemsSidebarRecord,
): SidebarGroupIdBySection["systems"] | undefined {
  return resolveSystemsSidebarGroupWithSource(record)?.groupId;
}

export function validateSidebarGroupingForRecord(
  kind: SidebarGroupingKind,
  recordId: string,
  record: SidebarGroupingRecordByKind[SidebarGroupingKind],
): SidebarGroupingValidationIssue[] {
  const { sidebarGrouping } = record;
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

  if (issues.length > 0) {
    return issues;
  }

  const redundantOntologyGroup =
    kind === "concept"
      ? sectionHasRedundantConceptSidebarGrouping(record, sidebarGrouping)
      : kind === "module"
        ? sectionHasRedundantModuleSidebarGrouping(record, sidebarGrouping)
        : kind === "training-regime"
          ? sectionHasRedundantTrainingSidebarGrouping(record, sidebarGrouping)
          : sectionHasRedundantSystemSidebarGrouping(record, sidebarGrouping);

  if (redundantOntologyGroup) {
    issues.push({
      path: [redundantOntologyGroup.section],
      message: `Record ${recordId} defines redundant sidebarGrouping.${redundantOntologyGroup.section} = "${redundantOntologyGroup.editorialGroup}". Canonical classification membership already resolves this subgroup to "${redundantOntologyGroup.ontologyGroup}". Remove the editorial override until the ontology model needs a true exception.`,
    });
  }

  return issues;
}

function sectionHasRedundantConceptSidebarGrouping(
  record: ConceptsSidebarRecord,
  sidebarGrouping: SidebarGrouping,
):
  | {
      section: "concepts" | "glossary";
      editorialGroup: string;
      ontologyGroup: string;
    }
  | undefined {
  const conceptsEditorialGroup = sidebarGrouping.concepts;
  if (conceptsEditorialGroup) {
    const ontologyGroup = resolveConceptsSidebarGroupWithSource({
      ...record,
      sidebarGrouping: undefined,
    });
    if (ontologyGroup?.groupId === conceptsEditorialGroup) {
      return {
        section: "concepts",
        editorialGroup: conceptsEditorialGroup,
        ontologyGroup: ontologyGroup.groupId,
      };
    }
  }

  const glossaryEditorialGroup = sidebarGrouping.glossary;
  if (glossaryEditorialGroup) {
    const ontologyGroup = resolveGlossarySidebarGroupWithSource({
      ...record,
      sidebarGrouping: undefined,
    });
    if (ontologyGroup?.groupId === glossaryEditorialGroup) {
      return {
        section: "glossary",
        editorialGroup: glossaryEditorialGroup,
        ontologyGroup: ontologyGroup.groupId,
      };
    }
  }

  return undefined;
}

function sectionHasRedundantModuleSidebarGrouping(
  record: ModulesSidebarRecord,
  sidebarGrouping: SidebarGrouping,
):
  | {
      section: "modules";
      editorialGroup: string;
      ontologyGroup: string;
    }
  | undefined {
  const editorialGroup = sidebarGrouping.modules;
  if (!editorialGroup) {
    return undefined;
  }

  const ontologyGroup = resolveOntologyModulesSidebarGroup(record);
  if (!ontologyGroup) {
    return undefined;
  }

  if (
    shouldUseEditorialModulesSidebarFallback(record, ontologyGroup) &&
    editorialGroup !== ontologyGroup.groupId
  ) {
    return undefined;
  }

  return {
    section: "modules",
    editorialGroup,
    ontologyGroup: ontologyGroup.groupId,
  };
}

function sectionHasRedundantTrainingSidebarGrouping(
  record: TrainingSidebarRecord,
  sidebarGrouping: SidebarGrouping,
):
  | {
      section: "training";
      editorialGroup: string;
      ontologyGroup: string;
    }
  | undefined {
  const editorialGroup = sidebarGrouping.training;
  if (!editorialGroup) {
    return undefined;
  }

  const ontologyGroup = resolveTrainingSidebarGroupWithSource({
    ...record,
    sidebarGrouping: undefined,
  });
  if (!ontologyGroup) {
    return undefined;
  }

  return {
    section: "training",
    editorialGroup,
    ontologyGroup: ontologyGroup.groupId,
  };
}

function sectionHasRedundantSystemSidebarGrouping(
  record: SystemsSidebarRecord,
  sidebarGrouping: SidebarGrouping,
):
  | {
      section: "systems";
      editorialGroup: string;
      ontologyGroup: string;
    }
  | undefined {
  const editorialGroup = sidebarGrouping.systems;
  if (!editorialGroup) {
    return undefined;
  }

  const ontologyGroup = resolveSystemsSidebarGroupWithSource({
    ...record,
    sidebarGrouping: undefined,
  });
  if (!ontologyGroup) {
    return undefined;
  }

  return {
    section: "systems",
    editorialGroup,
    ontologyGroup: ontologyGroup.groupId,
  };
}
