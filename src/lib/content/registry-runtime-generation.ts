import { readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import {
  getProjectRoot,
  getRegistryCollectionRoot,
  getRegistryRoot,
  type RegistryCollection,
} from "./content-paths";
import {
  loadRegistry,
  RegistryLoadError,
  type RegistryLoadErrorDetail,
} from "./registry";

type RuntimeRegistryDirectory = {
  directory: Exclude<RegistryCollection, "graphs" | "tables">;
  recordType: string;
  schemaName: string;
  recordsConst: string;
  mapConst: string;
};

const runtimeRegistryDirectories: RuntimeRegistryDirectory[] = [
  {
    directory: "modules",
    recordType: "ModuleRecord",
    schemaName: "moduleRecordSchema",
    recordsConst: "moduleRecords",
    mapConst: "modulesById",
  },
  {
    directory: "concepts",
    recordType: "ConceptRecord",
    schemaName: "conceptRecordSchema",
    recordsConst: "conceptRecords",
    mapConst: "conceptsById",
  },
  {
    directory: "models",
    recordType: "ModelRecord",
    schemaName: "modelRecordSchema",
    recordsConst: "modelRecords",
    mapConst: "modelsById",
  },
  {
    directory: "classifications",
    recordType: "ClassificationRecord",
    schemaName: "classificationRecordSchema",
    recordsConst: "classificationRecords",
    mapConst: "classificationsById",
  },
  {
    directory: "papers",
    recordType: "PaperRecord",
    schemaName: "paperRecordSchema",
    recordsConst: "paperRecords",
    mapConst: "papersById",
  },
  {
    directory: "training-regimes",
    recordType: "TrainingRegimeRecord",
    schemaName: "trainingRegimeRecordSchema",
    recordsConst: "trainingRegimeRecords",
    mapConst: "trainingRegimesById",
  },
  {
    directory: "systems",
    recordType: "SystemRecord",
    schemaName: "systemRecordSchema",
    recordsConst: "systemRecords",
    mapConst: "systemsById",
  },
  {
    directory: "datasets",
    recordType: "DatasetRecord",
    schemaName: "datasetRecordSchema",
    recordsConst: "datasetRecords",
    mapConst: "datasetsById",
  },
  {
    directory: "organizations",
    recordType: "OrganizationRecord",
    schemaName: "organizationRecordSchema",
    recordsConst: "organizationRecords",
    mapConst: "organizationsById",
  },
  {
    directory: "tags",
    recordType: "TagRecord",
    schemaName: "tagRecordSchema",
    recordsConst: "tagRecords",
    mapConst: "tagsById",
  },
  {
    directory: "citations",
    recordType: "CitationRecord",
    schemaName: "citationRecordSchema",
    recordsConst: "citationRecords",
    mapConst: "citationsById",
  },
];

const generatedModuleHeader = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 *
 * Source: scripts/generate-registry-runtime.ts
 * Authoritative inputs: registry JSON files under src/content/registry
 */
`;

export type GenerateRegistryRuntimeSourceOptions = {
  outputPath: string;
  projectRoot?: string;
  registryRoot?: string;
};

function formatRegistryLoadErrorDetail(
  detail: RegistryLoadErrorDetail,
): string {
  switch (detail.type) {
    case "duplicate-id":
      return `duplicate registry id "${detail.id}" in ${detail.paths.join(", ")}`;
    case "duplicate-slug":
      return `duplicate registry slug "${detail.slug}" in ${detail.paths.join(", ")}`;
    case "parse-error":
      return `${detail.path}: ${detail.message}`;
  }
}

function buildRegistryRuntimeGenerationError(
  registryRoot: string,
  error: RegistryLoadError,
): Error {
  const message = [
    `Failed to generate registry runtime from ${registryRoot}.`,
    ...error.details.map(
      (detail) => `- ${formatRegistryLoadErrorDetail(detail)}`,
    ),
  ].join("\n");

  return new Error(message, { cause: error });
}

function normalizeImportPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

function importPathFromOutput(outputPath: string, targetPath: string): string {
  return normalizeImportPath(relative(dirname(outputPath), targetPath));
}

function listJsonFiles(directoryPath: string): string[] {
  try {
    return readdirSync(directoryPath)
      .filter((entry) => entry.endsWith(".json"))
      .sort();
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function buildSchemaImportPath(
  outputPath: string,
  projectRoot: string,
): string {
  return importPathFromOutput(
    outputPath,
    join(projectRoot, "src", "lib", "content", "schemas"),
  );
}

function buildRelatedDocsImportPath(
  outputPath: string,
  projectRoot: string,
): string {
  return importPathFromOutput(
    outputPath,
    join(projectRoot, "src", "lib", "content", "related-docs"),
  );
}

function buildPublishedDocsImportPath(
  outputPath: string,
  projectRoot: string,
): string {
  return importPathFromOutput(
    outputPath,
    join(projectRoot, "src", "lib", "content", "published-docs-registry-ids"),
  );
}

function buildGeneratedSource(
  outputPath: string,
  projectRoot: string,
  registryRoot: string,
): string {
  const schemaImportPath = buildSchemaImportPath(outputPath, projectRoot);
  const relatedDocsImportPath = buildRelatedDocsImportPath(
    outputPath,
    projectRoot,
  );
  const publishedDocsImportPath = buildPublishedDocsImportPath(
    outputPath,
    projectRoot,
  );

  const importLines: string[] = [];
  const arrayLines: string[] = [];
  const mapLines: string[] = [];
  const usedSchemaNames = new Set<string>();
  let importIndex = 0;

  for (const directory of runtimeRegistryDirectories) {
    const directoryPath = getRegistryCollectionRoot(
      directory.directory,
      registryRoot,
    );
    const jsonFiles = listJsonFiles(directoryPath);

    for (const fileName of jsonFiles) {
      const variableName = `registryRecord_${importIndex++}`;
      const importPath = importPathFromOutput(
        outputPath,
        join(directoryPath, fileName),
      );
      importLines.push(`import ${variableName} from "${importPath}";`);
      arrayLines.push(`  ${directory.schemaName}.parse(${variableName}),`);
    }

    if (jsonFiles.length > 0) {
      usedSchemaNames.add(directory.schemaName);
    }

    const records = arrayLines.splice(
      Math.max(0, arrayLines.length - jsonFiles.length),
      jsonFiles.length,
    );

    const source = records.length > 0 ? records.join("\n") : "";

    if (source.length > 0) {
      arrayLines.push(
        `const ${directory.recordsConst}: ${directory.recordType}[] = [`,
      );
      arrayLines.push(source);
      arrayLines.push("];", "");
    } else {
      arrayLines.push(
        `const ${directory.recordsConst}: ${directory.recordType}[] = [];`,
        "",
      );
    }

    if (directory.directory === "classifications") {
      mapLines.push(
        `const ${directory.mapConst} = new Map<string, ${directory.recordType}>(`,
        `  ${directory.recordsConst}.flatMap((record) => [`,
        "    [record.id, record] as const,",
        "    ...((record.legacyIds ?? []).map((legacyId) => [legacyId, record] as const)),",
        "  ]),",
        ");",
      );
      continue;
    }

    mapLines.push(
      `const ${directory.mapConst} = new Map<string, ${directory.recordType}>(`,
      `  ${directory.recordsConst}.map((record) => [record.id, record]),`,
      ");",
    );
  }

  const recordTypeImports = [
    "type CitationRecord",
    "type ClassificationRecord",
    "type ConceptRecord",
    "type DatasetRecord",
    "type ModelRecord",
    "type ModuleRecord",
    "type OrganizationRecord",
    "type PaperRecord",
    "type SystemRecord",
    "type TagRecord",
    "type TrainingRegimeRecord",
  ];
  const schemaImports = [
    "citationRecordSchema",
    "classificationRecordSchema",
    "conceptRecordSchema",
    "datasetRecordSchema",
    "modelRecordSchema",
    "moduleRecordSchema",
    "organizationRecordSchema",
    "paperRecordSchema",
    "systemRecordSchema",
    "tagRecordSchema",
    "trainingRegimeRecordSchema",
  ].filter((schemaName) => usedSchemaNames.has(schemaName));
  const recordImports = [...recordTypeImports, ...schemaImports].join(",\n  ");

  return `${generatedModuleHeader}
// biome-ignore assist/source/organizeImports: generated file preserves deterministic discovery order
import {
  PUBLISHED_DOCS_REGISTRY_IDS,
  type PublishedDocsRegistryIds,
} from "${publishedDocsImportPath}";
import type { RelatedRegistryRecord } from "${relatedDocsImportPath}";
import {
  ${recordImports},
} from "${schemaImportPath}";
${importLines.join("\n")}

${arrayLines.join("\n")}
${mapLines.join("\n")}
const classificationChildrenByParentId = new Map<string, ClassificationRecord[]>();

for (const record of classificationRecords) {
  if (!record.parentClassificationId) {
    continue;
  }

  const existingChildren =
    classificationChildrenByParentId.get(record.parentClassificationId) ?? [];
  existingChildren.push(record);
  classificationChildrenByParentId.set(
    record.parentClassificationId,
    existingChildren,
  );
}

type TaggedRegistryRecord =
  | ModuleRecord
  | ConceptRecord
  | ModelRecord
  | PaperRecord
  | TrainingRegimeRecord
  | SystemRecord
  | DatasetRecord
  | OrganizationRecord;

type OntologyParticipatingRegistryRecord =
  | ModuleRecord
  | ConceptRecord
  | ModelRecord
  | PaperRecord
  | TrainingRegimeRecord
  | SystemRecord
  | DatasetRecord;

type RuntimeRegistryRecord =
  | TaggedRegistryRecord
  | ClassificationRecord
  | TagRecord
  | CitationRecord;

type OntologyRelationshipType =
  | "variant"
  | "part-of"
  | "uses"
  | "used-by"
  | "explains"
  | "prerequisite"
  | "related";

export type ResolvedOntologyRelationship = {
  relationshipType: OntologyRelationshipType;
  targetId: string;
  target: RuntimeRegistryRecord | undefined;
};

export type LegacyClassificationBridge = {
  legacyId: string;
  canonicalId: string;
};

type OntologyParticipantKind = OntologyParticipatingRegistryRecord["kind"];

export type ClassificationTraversalOptions = {
  classifiesKinds?: readonly OntologyParticipantKind[];
  statuses?: readonly ClassificationRecord["status"][];
};

export type ClassificationMemberQueryOptions = {
  includeDescendants?: boolean;
  includeSecondary?: boolean;
};

export type ClassificationMember = {
  classificationId: string;
  classification: ClassificationRecord;
  isInherited: boolean;
  membershipType: "primary" | "secondary";
  record: OntologyParticipatingRegistryRecord;
};

export type ClassificationTreeRecordNode = {
  nodeType: "record";
  member: ClassificationMember;
};

export type ClassificationTreeClassificationNode = {
  nodeType: "classification";
  classification: ClassificationRecord;
  children: ClassificationTreeNode[];
  classificationChildren: ClassificationTreeClassificationNode[];
  recordChildren: ClassificationTreeRecordNode[];
  directMemberCount: number;
  totalMemberCount: number;
};

export type ClassificationTreeNode =
  | ClassificationTreeClassificationNode
  | ClassificationTreeRecordNode;

export type ClassificationTreeOptions = {
  classificationTraversal?: ClassificationTraversalOptions;
  includeEmptyClassifications?: boolean;
  memberKinds?: readonly OntologyParticipantKind[];
  memberQuery?: ClassificationMemberQueryOptions;
  rootClassificationIds?: readonly string[];
};

export type ClassificationSubtreeRecordPlacement = "owning-classification";

export type ClassificationSubtreeEmptyBehavior =
  | "prune-empty-leaves"
  | "include-empty-leaves";

export type ClassificationSubtreeClassificationNode = {
  nodeType: "classification";
  classification: ClassificationRecord;
  children: ClassificationSubtreeNode[];
  classificationChildren: ClassificationSubtreeClassificationNode[];
  recordChildren: ClassificationTreeRecordNode[];
  directMemberCount: number;
  descendantMemberCount: number;
  totalMemberCount: number;
  hasMatchingMembers: boolean;
};

export type ClassificationSubtreeNode =
  | ClassificationSubtreeClassificationNode
  | ClassificationTreeRecordNode;

export type ClassificationSubtreeResult = {
  emptyBehavior: ClassificationSubtreeEmptyBehavior;
  filters: {
    classificationKinds: OntologyParticipantKind[];
    memberKinds: OntologyParticipantKind[];
    memberPlacement: ClassificationSubtreeRecordPlacement;
    rootClassificationIds: string[];
    statuses: ClassificationRecord["status"][];
    includeSecondary: boolean;
  };
  isEmpty: boolean;
  memberPlacement: ClassificationSubtreeRecordPlacement;
  roots: ClassificationSubtreeClassificationNode[];
};

export type ClassificationBranchMembership = {
  classification: ClassificationRecord;
  descendantMemberCount: number;
  descendantMembers: ClassificationMember[];
  directMemberCount: number;
  directMembers: ClassificationMember[];
  memberPlacement: ClassificationSubtreeRecordPlacement;
  totalMemberCount: number;
  totalMembers: ClassificationMember[];
};

const defaultClassificationStatuses: ClassificationRecord["status"][] = [
  "published",
];

function compareOptionalSortOrder(
  left: number | undefined,
  right: number | undefined,
): number {
  if (left === undefined && right === undefined) {
    return 0;
  }

  if (left === undefined) {
    return 1;
  }

  if (right === undefined) {
    return -1;
  }

  return left - right;
}

function compareString(left: string, right: string): number {
  return left.localeCompare(right);
}

function compareClassificationRecords(
  left: ClassificationRecord,
  right: ClassificationRecord,
): number {
  const sortOrder = compareOptionalSortOrder(left.sortOrder, right.sortOrder);
  if (sortOrder !== 0) {
    return sortOrder;
  }

  const slugOrder = compareString(left.slug, right.slug);
  if (slugOrder !== 0) {
    return slugOrder;
  }

  return compareString(left.id, right.id);
}

function compareOntologyParticipatingRecords(
  left: OntologyParticipatingRegistryRecord,
  right: OntologyParticipatingRegistryRecord,
): number {
  const sortOrder = compareOptionalSortOrder(left.sortOrder, right.sortOrder);
  if (sortOrder !== 0) {
    return sortOrder;
  }

  const kindOrder = compareString(left.kind, right.kind);
  if (kindOrder !== 0) {
    return kindOrder;
  }

  const slugOrder = compareString(left.slug, right.slug);
  if (slugOrder !== 0) {
    return slugOrder;
  }

  return compareString(left.id, right.id);
}

function compareClassificationMembers(
  left: ClassificationMember,
  right: ClassificationMember,
): number {
  const recordOrder = compareOntologyParticipatingRecords(
    left.record,
    right.record,
  );
  if (recordOrder !== 0) {
    return recordOrder;
  }

  const membershipOrder = compareString(
    left.membershipType,
    right.membershipType,
  );
  if (membershipOrder !== 0) {
    return membershipOrder;
  }

  return compareClassificationRecords(left.classification, right.classification);
}

function matchesClassificationTraversalOptions(
  classification: ClassificationRecord,
  options: ClassificationTraversalOptions = {},
): boolean {
  const statuses = options.statuses ?? defaultClassificationStatuses;
  if (
    statuses.length > 0 &&
    !statuses.some((status) => status === classification.status)
  ) {
    return false;
  }

  if (!options.classifiesKinds?.length) {
    return true;
  }

  return options.classifiesKinds.some((kind) =>
    classification.classifiesKinds.includes(kind),
  );
}

function matchesClassificationMemberKind(
  member: ClassificationMember,
  memberKinds: readonly OntologyParticipantKind[] | undefined,
): boolean {
  if (!memberKinds?.length) {
    return true;
  }

  return memberKinds.some((kind) => kind === member.record.kind);
}

function listDirectClassificationMembers(
  classificationId: string,
  options: ClassificationMemberQueryOptions = {},
): ClassificationMember[] {
  const resolvedClassificationId = resolveClassificationId(classificationId);
  if (!resolvedClassificationId) {
    return [];
  }

  const classification = classificationsById.get(resolvedClassificationId);
  if (!classification) {
    return [];
  }

  const members: ClassificationMember[] = [];

  for (const record of listRelatedRegistryRecords()) {
    if (record.kind === "organization") {
      continue;
    }

    if (
      record.primaryClassificationId &&
      resolveClassificationId(record.primaryClassificationId) ===
        resolvedClassificationId
    ) {
      members.push({
        classificationId: resolvedClassificationId,
        classification,
        isInherited: false,
        membershipType: "primary",
        record,
      });
    }

    if (
      options.includeSecondary &&
      record.secondaryClassificationIds?.some(
        (secondaryClassificationId) =>
          resolveClassificationId(secondaryClassificationId) ===
          resolvedClassificationId,
      )
    ) {
      members.push({
        classificationId: resolvedClassificationId,
        classification,
        isInherited: false,
        membershipType: "secondary",
        record,
      });
    }
  }

  return members.sort(compareClassificationMembers);
}

function matchesRequestedMemberKinds(
  members: ClassificationMember[],
  memberKinds: readonly OntologyParticipantKind[] | undefined,
): ClassificationMember[] {
  return members.filter((member) =>
    matchesClassificationMemberKind(member, memberKinds),
  );
}

function getTaggedRecordById(
  registryId: string,
): TaggedRegistryRecord | undefined {
  return (
    modulesById.get(registryId) ??
    conceptsById.get(registryId) ??
    modelsById.get(registryId) ??
    papersById.get(registryId) ??
    trainingRegimesById.get(registryId) ??
    systemsById.get(registryId) ??
    datasetsById.get(registryId) ??
    organizationsById.get(registryId)
  );
}

function getOntologyParticipatingRecordById(
  registryId: string,
): OntologyParticipatingRegistryRecord | undefined {
  return (
    modulesById.get(registryId) ??
    conceptsById.get(registryId) ??
    modelsById.get(registryId) ??
    papersById.get(registryId) ??
    trainingRegimesById.get(registryId) ??
    systemsById.get(registryId) ??
    datasetsById.get(registryId)
  );
}

function getRuntimeRecordById(
  registryId: string,
): RuntimeRegistryRecord | undefined {
  return (
    getTaggedRecordById(registryId) ??
    classificationsById.get(registryId) ??
    tagsById.get(registryId) ??
    citationsById.get(registryId)
  );
}

/** Synchronous module lookup for client MDX components and tests. */
export function getModuleById(registryId: string): ModuleRecord | undefined {
  return modulesById.get(registryId);
}

/** Synchronous concept lookup for client MDX components and tests. */
export function getConceptById(registryId: string): ConceptRecord | undefined {
  return conceptsById.get(registryId);
}

/** Synchronous model lookup for docs components and tests. */
export function getModelById(registryId: string): ModelRecord | undefined {
  return modelsById.get(registryId);
}

export function getClassificationById(
  registryId: string,
): ClassificationRecord | undefined {
  return classificationsById.get(registryId);
}

export function getParentClassificationById(
  registryId: string,
): ClassificationRecord | undefined {
  const classification = getClassificationById(registryId);
  if (!classification?.parentClassificationId) {
    return undefined;
  }
  return classificationsById.get(classification.parentClassificationId);
}

export function listChildClassifications(
  classificationId: string,
): ClassificationRecord[] {
  const resolvedClassificationId = resolveClassificationId(classificationId);
  if (!resolvedClassificationId) {
    return [];
  }

  return classificationChildrenByParentId.get(resolvedClassificationId) ?? [];
}

export function resolveClassificationId(
  registryId: string,
): string | undefined {
  return classificationsById.get(registryId)?.id;
}

export function listLegacyClassificationBridges(): LegacyClassificationBridge[] {
  return classificationRecords.flatMap((record) =>
    (record.legacyIds ?? []).map((legacyId) => ({
      legacyId,
      canonicalId: record.id,
    })),
  );
}

export function getPaperById(registryId: string): PaperRecord | undefined {
  return papersById.get(registryId);
}

export function getTrainingRegimeById(
  registryId: string,
): TrainingRegimeRecord | undefined {
  return trainingRegimesById.get(registryId);
}

export function getSystemById(registryId: string): SystemRecord | undefined {
  return systemsById.get(registryId);
}

export function getDatasetById(registryId: string): DatasetRecord | undefined {
  return datasetsById.get(registryId);
}

export function getOrganizationById(
  registryId: string,
): OrganizationRecord | undefined {
  return organizationsById.get(registryId);
}

/** Synchronous tag lookup for client prose auto-linking and tests. */
export function getTagById(registryId: string): TagRecord | undefined {
  return tagsById.get(registryId);
}

/** Synchronous citation lookup for source metadata and tests. */
export function getCitationById(
  registryId: string,
): CitationRecord | undefined {
  return citationsById.get(registryId);
}

export function listModuleRecords(): ModuleRecord[] {
  return [...moduleRecords];
}

export function listConceptRecords(): ConceptRecord[] {
  return [...conceptRecords];
}

export function listModelRecords(): ModelRecord[] {
  return [...modelRecords];
}

export function listClassificationRecords(): ClassificationRecord[] {
  return [...classificationRecords];
}

export function listClassificationRoots(
  options: ClassificationTraversalOptions = {},
): ClassificationRecord[] {
  return classificationRecords
    .filter(
      (classification) =>
        !classification.parentClassificationId &&
        matchesClassificationTraversalOptions(classification, options),
    )
    .sort(compareClassificationRecords);
}

export function listClassificationChildren(
  classificationId: string,
  options: ClassificationTraversalOptions = {},
): ClassificationRecord[] {
  const resolvedClassificationId = resolveClassificationId(classificationId);
  if (!resolvedClassificationId) {
    return [];
  }

  return classificationRecords
    .filter(
      (classification) =>
        classification.parentClassificationId === resolvedClassificationId &&
        matchesClassificationTraversalOptions(classification, options),
    )
    .sort(compareClassificationRecords);
}

export function listClassificationAncestors(
  classificationId: string,
  options: ClassificationTraversalOptions = {},
): ClassificationRecord[] {
  const resolvedClassificationId = resolveClassificationId(classificationId);
  if (!resolvedClassificationId) {
    return [];
  }

  const ancestors: ClassificationRecord[] = [];
  const visited = new Set<string>();
  let parentClassificationId =
    classificationsById.get(resolvedClassificationId)?.parentClassificationId;

  while (parentClassificationId && !visited.has(parentClassificationId)) {
    visited.add(parentClassificationId);
    const parent = classificationsById.get(parentClassificationId);
    if (!parent) {
      break;
    }

    if (matchesClassificationTraversalOptions(parent, options)) {
      ancestors.push(parent);
    }
    parentClassificationId = parent.parentClassificationId;
  }

  return ancestors;
}

export function listClassificationDescendants(
  classificationId: string,
  options: ClassificationTraversalOptions = {},
): ClassificationRecord[] {
  const resolvedClassificationId = resolveClassificationId(classificationId);
  if (!resolvedClassificationId) {
    return [];
  }

  const descendants: ClassificationRecord[] = [];
  const visited = new Set<string>();
  const stack = listClassificationChildren(resolvedClassificationId, {
    ...options,
    statuses: options.statuses ?? [],
  })
    .sort(compareClassificationRecords)
    .reverse();

  while (stack.length > 0) {
    const classification = stack.pop();
    if (!classification || visited.has(classification.id)) {
      continue;
    }

    visited.add(classification.id);
    if (matchesClassificationTraversalOptions(classification, options)) {
      descendants.push(classification);
    }

    const children = listClassificationChildren(classification.id, {
      ...options,
      statuses: options.statuses ?? [],
    })
      .sort(compareClassificationRecords)
      .reverse();
    for (const child of children) {
      stack.push(child);
    }
  }

  return descendants;
}

export function listPaperRecords(): PaperRecord[] {
  return [...paperRecords];
}

export function listTrainingRegimeRecords(): TrainingRegimeRecord[] {
  return [...trainingRegimeRecords];
}

export function listSystemRecords(): SystemRecord[] {
  return [...systemRecords];
}

export function listDatasetRecords(): DatasetRecord[] {
  return [...datasetRecords];
}

export function listOrganizationRecords(): OrganizationRecord[] {
  return [...organizationRecords];
}

export function listTagRecords(): TagRecord[] {
  return [...tagRecords];
}

export function listCitationRecords(): CitationRecord[] {
  return [...citationRecords];
}

/** Registry records used for derived related-document groups. */
export function listRelatedRegistryRecords(): RelatedRegistryRecord[] {
  return [
    ...moduleRecords,
    ...conceptRecords,
    ...modelRecords,
    ...paperRecords,
    ...trainingRegimeRecords,
    ...systemRecords,
    ...datasetRecords,
    ...organizationRecords,
  ];
}

/** Synchronous registry lookup for related-doc capable registry records. */
export function getRegistryRecordById(
  registryId: string,
): RelatedRegistryRecord | undefined {
  return getTaggedRecordById(registryId);
}

/** Registry ids with a published docs page (used to avoid broken related links). */
export function getPublishedDocsRegistryIds(): PublishedDocsRegistryIds {
  return PUBLISHED_DOCS_REGISTRY_IDS;
}

/** Tags declared on a registry record, when the record exists. */
export function getRegistryTags(registryId: string): string[] | undefined {
  return getTaggedRecordById(registryId)?.tags;
}

/** Citation IDs declared on a registry record, when the record exists. */
export function getRegistryCitationIds(
  registryId: string,
): string[] | undefined {
  return getTaggedRecordById(registryId)?.citationIds;
}

export function getPrimaryClassificationForRecord(
  registryId: string,
  options?: ClassificationTraversalOptions,
): ClassificationRecord | undefined {
  const record = getOntologyParticipatingRecordById(registryId);
  if (!record?.primaryClassificationId) {
    return undefined;
  }

  const classification = classificationsById.get(record.primaryClassificationId);
  if (!classification) {
    return undefined;
  }

  if (options && !matchesClassificationTraversalOptions(classification, options)) {
    return undefined;
  }

  return classification;
}

export function listSecondaryClassificationsForRecord(
  registryId: string,
  options?: ClassificationTraversalOptions,
): ClassificationRecord[] {
  const record = getOntologyParticipatingRecordById(registryId);
  if (!record?.secondaryClassificationIds?.length) {
    return [];
  }

  return record.secondaryClassificationIds
    .flatMap((classificationId) => {
      const classification = classificationsById.get(classificationId);
      if (!classification) {
        return [];
      }

      if (
        options &&
        !matchesClassificationTraversalOptions(classification, options)
      ) {
        return [];
      }

      return [classification];
    })
    .sort(compareClassificationRecords);
}

export function listOntologyRelationshipsForRecord(
  registryId: string,
  relationshipType?: OntologyRelationshipType,
): ResolvedOntologyRelationship[] {
  const record = getOntologyParticipatingRecordById(registryId);
  if (!record?.relationships?.length) {
    return [];
  }

  return record.relationships
    .filter(
      (relationship) =>
        relationshipType === undefined ||
        relationship.relationshipType === relationshipType,
    )
    .map((relationship) => ({
      relationshipType: relationship.relationshipType,
      targetId: relationship.targetId,
      target: getRuntimeRecordById(relationship.targetId),
    }));
}

export function listClassificationMembers(
  classificationId: string,
  options: ClassificationMemberQueryOptions = {},
): ClassificationMember[] {
  const resolvedClassificationId = resolveClassificationId(classificationId);
  if (!resolvedClassificationId) {
    return [];
  }

  const directMembers = listDirectClassificationMembers(
    resolvedClassificationId,
    options,
  );
  if (!options.includeDescendants) {
    return directMembers;
  }

  const inheritedMembers = listClassificationDescendants(
    resolvedClassificationId,
    {},
  ).flatMap((classification) =>
    listDirectClassificationMembers(classification.id, options).map(
      (member) => ({
        ...member,
        isInherited: true,
      }),
    ),
  );

  return [...directMembers, ...inheritedMembers].sort(
    compareClassificationMembers,
  );
}

function resolveTreeRootClassifications(
  options: ClassificationTreeOptions = {},
): ClassificationRecord[] {
  const classificationTraversal = options.classificationTraversal ?? {};

  return (
    options.rootClassificationIds?.flatMap((classificationId) => {
      const resolvedClassificationId = resolveClassificationId(classificationId);
      if (!resolvedClassificationId) {
        return [];
      }

      const classification = classificationsById.get(resolvedClassificationId);
      if (
        !classification ||
        !matchesClassificationTraversalOptions(classification, classificationTraversal)
      ) {
        return [];
      }

      return [classification];
    }) ?? listClassificationRoots(classificationTraversal)
  );
}

function buildClassificationTreeNode(
  classification: ClassificationRecord,
  options: ClassificationTreeOptions = {},
): ClassificationTreeClassificationNode | undefined {
  const classificationTraversal = options.classificationTraversal ?? {};
  const memberQuery = options.memberQuery ?? {};
  const classificationChildren = listClassificationChildren(classification.id, {
    ...classificationTraversal,
    statuses: classificationTraversal.statuses ?? [],
  })
    .map((childClassification) =>
      buildClassificationTreeNode(childClassification, options),
    )
    .flatMap((node) => (node ? [node] : []));
  const recordChildren = listClassificationMembers(classification.id, memberQuery)
    .filter((member) => !member.isInherited)
    .filter((member) =>
      matchesClassificationMemberKind(member, options.memberKinds),
    )
    .map((member) => ({
      nodeType: "record" as const,
      member,
    }));
  const directMemberCount = recordChildren.length;
  const totalMemberCount =
    directMemberCount +
    classificationChildren.reduce(
      (count, childClassification) => count + childClassification.totalMemberCount,
      0,
    );

  if (
    options.includeEmptyClassifications !== true &&
    totalMemberCount === 0 &&
    classificationChildren.length === 0
  ) {
    return undefined;
  }

  return {
    nodeType: "classification",
    classification,
    children: [...classificationChildren, ...recordChildren],
    classificationChildren,
    recordChildren,
    directMemberCount,
    totalMemberCount,
  };
}

export function buildClassificationTree(
  options: ClassificationTreeOptions = {},
): ClassificationTreeClassificationNode[] {
  return resolveTreeRootClassifications(options)
    .map((classification) => buildClassificationTreeNode(classification, options))
    .flatMap((node) => (node ? [node] : []));
}

function buildClassificationSubtreeNode(
  classification: ClassificationRecord,
  options: ClassificationTreeOptions = {},
): ClassificationSubtreeClassificationNode | undefined {
  const classificationTraversal = options.classificationTraversal ?? {};
  const memberQuery = options.memberQuery ?? {};
  const classificationChildren = listClassificationChildren(classification.id, {
    ...classificationTraversal,
    statuses: classificationTraversal.statuses ?? [],
  })
    .map((childClassification) =>
      buildClassificationSubtreeNode(childClassification, options),
    )
    .flatMap((node) => (node ? [node] : []));
  const recordChildren = matchesRequestedMemberKinds(
    listClassificationMembers(classification.id, memberQuery).filter(
      (member) => !member.isInherited,
    ),
    options.memberKinds,
  ).map((member) => ({
    nodeType: "record" as const,
    member,
  }));
  const directMemberCount = recordChildren.length;
  const descendantMemberCount = classificationChildren.reduce(
    (count, childClassification) => count + childClassification.totalMemberCount,
    0,
  );
  const totalMemberCount = directMemberCount + descendantMemberCount;

  if (
    options.includeEmptyClassifications !== true &&
    totalMemberCount === 0 &&
    classificationChildren.length === 0
  ) {
    return undefined;
  }

  return {
    nodeType: "classification",
    classification,
    children: [...classificationChildren, ...recordChildren],
    classificationChildren,
    recordChildren,
    directMemberCount,
    descendantMemberCount,
    totalMemberCount,
    hasMatchingMembers: totalMemberCount > 0,
  };
}

export function buildClassificationSubtree(
  options: ClassificationTreeOptions = {},
): ClassificationSubtreeResult {
  const classificationTraversal = options.classificationTraversal ?? {};
  const rootClassifications = resolveTreeRootClassifications(options);
  const roots = rootClassifications
    .map((classification) =>
      buildClassificationSubtreeNode(classification, options),
    )
    .flatMap((node) => (node ? [node] : []));

  return {
    emptyBehavior:
      options.includeEmptyClassifications === true
        ? "include-empty-leaves"
        : "prune-empty-leaves",
    filters: {
      classificationKinds: [
        ...(classificationTraversal.classifiesKinds ?? []),
      ],
      memberKinds: [...(options.memberKinds ?? [])],
      memberPlacement: "owning-classification",
      rootClassificationIds: rootClassifications.map(
        (classification) => classification.id,
      ),
      statuses: [...(classificationTraversal.statuses ?? defaultClassificationStatuses)],
      includeSecondary: options.memberQuery?.includeSecondary === true,
    },
    isEmpty: roots.length === 0,
    memberPlacement: "owning-classification",
    roots,
  };
}

export function getClassificationBranchMembership(
  classificationId: string,
  options: Pick<
    ClassificationTreeOptions,
    "classificationTraversal" | "memberKinds" | "memberQuery"
  > = {},
): ClassificationBranchMembership | undefined {
  const resolvedClassificationId = resolveClassificationId(classificationId);
  if (!resolvedClassificationId) {
    return undefined;
  }

  const classification = classificationsById.get(resolvedClassificationId);
  if (!classification) {
    return undefined;
  }

  if (
    options.classificationTraversal &&
    !matchesClassificationTraversalOptions(
      classification,
      options.classificationTraversal,
    )
  ) {
    return undefined;
  }

  const totalMembers = matchesRequestedMemberKinds(
    listClassificationMembers(resolvedClassificationId, {
      ...(options.memberQuery ?? {}),
      includeDescendants: true,
    }),
    options.memberKinds,
  );
  const directMembers = totalMembers.filter((member) => !member.isInherited);
  const descendantMembers = totalMembers.filter((member) => member.isInherited);

  return {
    classification,
    descendantMemberCount: descendantMembers.length,
    descendantMembers,
    directMemberCount: directMembers.length,
    directMembers,
    memberPlacement: "owning-classification",
    totalMemberCount: totalMembers.length,
    totalMembers,
  };
}
`;
}

export async function generateRegistryRuntimeSource(
  options: GenerateRegistryRuntimeSourceOptions,
): Promise<string> {
  const projectRoot = options.projectRoot ?? getProjectRoot();
  const registryRoot = options.registryRoot ?? getRegistryRoot(projectRoot);
  try {
    await loadRegistry({ registryRoot });
  } catch (error) {
    if (error instanceof RegistryLoadError) {
      throw buildRegistryRuntimeGenerationError(registryRoot, error);
    }
    throw error;
  }
  return buildGeneratedSource(options.outputPath, projectRoot, registryRoot);
}

export async function writeGeneratedRegistryRuntimeModule(
  options: GenerateRegistryRuntimeSourceOptions,
): Promise<{ changed: boolean; source: string }> {
  const source = await generateRegistryRuntimeSource(options);
  await mkdir(dirname(options.outputPath), { recursive: true });

  let previousSource: string | undefined;
  try {
    previousSource = await readFile(options.outputPath, "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code !== "ENOENT") {
      throw error;
    }
  }

  if (previousSource === source) {
    return { changed: false, source };
  }

  await writeFile(options.outputPath, source);
  return { changed: true, source };
}
