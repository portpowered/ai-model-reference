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

export type ClassificationMember = {
  membershipType: "primary" | "secondary";
  record: OntologyParticipatingRegistryRecord;
};

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
): ClassificationRecord | undefined {
  const record = getOntologyParticipatingRecordById(registryId);
  if (!record?.primaryClassificationId) {
    return undefined;
  }
  return classificationsById.get(record.primaryClassificationId);
}

export function listSecondaryClassificationsForRecord(
  registryId: string,
): ClassificationRecord[] {
  const record = getOntologyParticipatingRecordById(registryId);
  if (!record?.secondaryClassificationIds?.length) {
    return [];
  }

  return record.secondaryClassificationIds.flatMap((classificationId) => {
    const classification = classificationsById.get(classificationId);
    return classification ? [classification] : [];
  });
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
): ClassificationMember[] {
  if (!classificationsById.has(classificationId)) {
    return [];
  }

  const members: ClassificationMember[] = [];

  for (const record of listRelatedRegistryRecords()) {
    if (record.kind === "organization") {
      continue;
    }

    if (record.primaryClassificationId === classificationId) {
      members.push({ membershipType: "primary", record });
    }

    if (record.secondaryClassificationIds?.includes(classificationId)) {
      members.push({ membershipType: "secondary", record });
    }
  }

  return members;
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
