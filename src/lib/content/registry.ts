import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getRegistryCollectionRoot,
  REGISTRY_ROOT,
  type RegistryCollection,
} from "./content-paths";
import type { RegistryIndexes, RegistryRecord } from "./registry-index";
import {
  type ClassificationRecord,
  citationRecordSchema,
  classificationRecordSchema,
  conceptRecordSchema,
  datasetRecordSchema,
  graphRecordSchema,
  modelRecordSchema,
  moduleRecordSchema,
  organizationRecordSchema,
  paperRecordSchema,
  systemRecordSchema,
  type TagRecord,
  tagRecordSchema,
  trainingRegimeRecordSchema,
} from "./schemas";
import { validateSidebarGroupingForRecord } from "./sidebar-grouping";

export type { RegistryIndexes, RegistryRecord } from "./registry-index";
export { getRegistryRecord } from "./registry-index";

export type RegistryLoadErrorDetail =
  | { type: "duplicate-id"; id: string; paths: string[] }
  | { type: "duplicate-slug"; slug: string; paths: string[] }
  | { type: "parse-error"; path: string; message: string };

export class RegistryLoadError extends Error {
  readonly details: RegistryLoadErrorDetail[];

  constructor(message: string, details: RegistryLoadErrorDetail[]) {
    super(message);
    this.name = "RegistryLoadError";
    this.details = details;
  }
}

const defaultRegistryRoot = REGISTRY_ROOT;

type RegistryDirectory = {
  name: Exclude<RegistryCollection, "tables">;
  schema:
    | typeof moduleRecordSchema
    | typeof conceptRecordSchema
    | typeof modelRecordSchema
    | typeof classificationRecordSchema
    | typeof paperRecordSchema
    | typeof trainingRegimeRecordSchema
    | typeof systemRecordSchema
    | typeof datasetRecordSchema
    | typeof organizationRecordSchema
    | typeof tagRecordSchema
    | typeof citationRecordSchema
    | typeof graphRecordSchema;
};

const registryDirectories: RegistryDirectory[] = [
  { name: "modules", schema: moduleRecordSchema },
  { name: "concepts", schema: conceptRecordSchema },
  { name: "models", schema: modelRecordSchema },
  { name: "classifications", schema: classificationRecordSchema },
  { name: "papers", schema: paperRecordSchema },
  { name: "training-regimes", schema: trainingRegimeRecordSchema },
  { name: "systems", schema: systemRecordSchema },
  { name: "datasets", schema: datasetRecordSchema },
  { name: "organizations", schema: organizationRecordSchema },
  { name: "tags", schema: tagRecordSchema },
  { name: "citations", schema: citationRecordSchema },
  { name: "graphs", schema: graphRecordSchema },
];

type ParsedRegistryFile = {
  path: string;
  record: RegistryRecord;
};

async function readRegistryDirectory(
  registryRoot: string,
  directory: RegistryDirectory,
): Promise<ParsedRegistryFile[]> {
  const directoryPath = getRegistryCollectionRoot(directory.name, registryRoot);
  let entries: string[];
  try {
    entries = await readdir(directoryPath);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      return [];
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new RegistryLoadError(
      `Failed to read registry directory ${directoryPath}`,
      [{ type: "parse-error", path: directoryPath, message }],
    );
  }

  const jsonFiles = entries.filter((entry) => entry.endsWith(".json")).sort();
  const parsed: ParsedRegistryFile[] = [];

  for (const fileName of jsonFiles) {
    const path = join(directoryPath, fileName);
    const raw = await readFile(path, "utf8");
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new RegistryLoadError(`Invalid JSON in registry file ${path}`, [
        { type: "parse-error", path, message },
      ]);
    }

    const result = directory.schema.safeParse(json);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new RegistryLoadError(
        `Registry schema validation failed for ${path}`,
        [{ type: "parse-error", path, message }],
      );
    }

    const sidebarGroupingRecord = result.data as
      | RegistryRecord
      | (RegistryRecord & { sidebarGrouping?: unknown });
    if (
      sidebarGroupingRecord.kind === "concept" ||
      sidebarGroupingRecord.kind === "module" ||
      sidebarGroupingRecord.kind === "training-regime" ||
      sidebarGroupingRecord.kind === "system"
    ) {
      const sidebarIssues = validateSidebarGroupingForRecord(
        sidebarGroupingRecord.kind,
        sidebarGroupingRecord.id,
        sidebarGroupingRecord,
      );
      if (sidebarIssues.length > 0) {
        const message = sidebarIssues
          .map(
            (issue) =>
              `sidebarGrouping.${issue.path.join(".")}: ${issue.message}`,
          )
          .join("; ");
        throw new RegistryLoadError(
          `Registry schema validation failed for ${path}`,
          [{ type: "parse-error", path, message }],
        );
      }
    }

    parsed.push({ path, record: result.data });
  }

  return parsed;
}

function buildIndexes(files: ParsedRegistryFile[]): RegistryIndexes {
  const byId = new Map<string, RegistryRecord>();
  const bySlug = new Map<string, RegistryRecord>();
  const classificationsById = new Map<string, ClassificationRecord>();
  const tagsById = new Map<string, TagRecord>();
  const tagsBySlug = new Map<string, TagRecord>();
  const idPaths = new Map<string, string[]>();
  const slugPathsByKind = new Map<string, string[]>();
  const classificationAliasPaths = new Map<string, string[]>();

  for (const { path, record } of files) {
    const existingIdPaths = idPaths.get(record.id) ?? [];
    existingIdPaths.push(path);
    idPaths.set(record.id, existingIdPaths);

    const slugKindKey = `${record.kind}:${record.slug}`;
    const existingSlugPaths = slugPathsByKind.get(slugKindKey) ?? [];
    existingSlugPaths.push(path);
    slugPathsByKind.set(slugKindKey, existingSlugPaths);

    byId.set(record.id, record);
    bySlug.set(record.slug, record);

    if (record.kind === "tag") {
      tagsById.set(record.id, record);
      tagsBySlug.set(record.slug, record);
    }

    if (record.kind === "classification") {
      classificationsById.set(record.id, record);
      for (const legacyId of record.legacyIds ?? []) {
        const existingAliasPaths = classificationAliasPaths.get(legacyId) ?? [];
        existingAliasPaths.push(path);
        classificationAliasPaths.set(legacyId, existingAliasPaths);
      }
    }
  }

  const details: RegistryLoadErrorDetail[] = [];
  for (const [id, paths] of idPaths) {
    if (paths.length > 1) {
      details.push({ type: "duplicate-id", id, paths });
    }
  }
  for (const [slugKindKey, paths] of slugPathsByKind) {
    if (paths.length > 1) {
      const slug = slugKindKey.slice(slugKindKey.indexOf(":") + 1);
      details.push({ type: "duplicate-slug", slug, paths });
    }
  }
  for (const [legacyId, paths] of classificationAliasPaths) {
    if (idPaths.has(legacyId)) {
      details.push({
        type: "parse-error",
        path: paths[0] ?? "",
        message: `legacyIds must not reuse an existing registry id "${legacyId}"`,
      });
      continue;
    }

    if (paths.length > 1) {
      details.push({
        type: "parse-error",
        path: paths[0] ?? "",
        message: `legacyIds must be unique across classification records, found duplicate "${legacyId}"`,
      });
    }
  }

  if (details.length > 0) {
    throw new RegistryLoadError(
      "Duplicate registry id or slug detected",
      details,
    );
  }

  for (const record of classificationsById.values()) {
    for (const legacyId of record.legacyIds ?? []) {
      byId.set(legacyId, record);
      classificationsById.set(legacyId, record);
    }
  }

  return { byId, bySlug, classificationsById, tagsById, tagsBySlug };
}

type OntologyParticipatingRecord = Extract<
  RegistryRecord,
  {
    primaryClassificationId?: string;
    secondaryClassificationIds?: string[];
    relationships?: Array<{ targetId: string }>;
  }
>;

type OntologyTaxonomyExpectation = {
  field: string;
  expectedValue: string;
};

const classificationIdPattern = /^classification\.[a-z0-9]+(?:\.[a-z0-9-]+)*$/;

const canonicalClassificationDomainKinds = new Map<
  string,
  ClassificationRecord["classifiesKinds"][number]
>([
  ["module", "module"],
  ["concept", "concept"],
  ["training", "training-regime"],
  ["system", "system"],
]);

const recordsRequiringOntologyPrimaryClassification = new Set<string>([
  "concept.activation",
  "training-regime.dpo",
  "training-regime.grpo",
  "system.routing",
]);

const taxonomyExpectationPrefixes: Array<{
  classificationIdPrefix: string;
  expectation: OntologyTaxonomyExpectation;
}> = [
  {
    classificationIdPrefix: "classification.module.activation",
    expectation: { field: "moduleType", expectedValue: "activation" },
  },
  {
    classificationIdPrefix: "classification.module.attention",
    expectation: { field: "moduleType", expectedValue: "attention" },
  },
  {
    classificationIdPrefix: "classification.module.feed-forward",
    expectation: { field: "moduleType", expectedValue: "feed-forward" },
  },
  {
    classificationIdPrefix: "classification.module.normalization",
    expectation: { field: "moduleType", expectedValue: "normalization" },
  },
  {
    classificationIdPrefix: "classification.module.positional-encoding",
    expectation: { field: "moduleType", expectedValue: "position-encoding" },
  },
  {
    classificationIdPrefix: "classification.module.tokenization",
    expectation: { field: "moduleType", expectedValue: "tokenizer" },
  },
  {
    classificationIdPrefix: "classification.module.transformer-block",
    expectation: { field: "moduleType", expectedValue: "other" },
  },
  {
    classificationIdPrefix: "classification.concept.architecture",
    expectation: { field: "conceptType", expectedValue: "architecture" },
  },
  {
    classificationIdPrefix: "classification.training.alignment",
    expectation: { field: "regimeType", expectedValue: "alignment" },
  },
  {
    classificationIdPrefix: "classification.system.routing",
    expectation: { field: "systemType", expectedValue: "routing" },
  },
];

function getClassificationNamespaceSegments(
  classificationId: string,
): string[] | undefined {
  if (!classificationIdPattern.test(classificationId)) {
    return undefined;
  }

  return classificationId.split(".");
}

function getExpectedParentClassificationId(
  classificationId: string,
): string | undefined {
  const segments = getClassificationNamespaceSegments(classificationId);
  if (!segments || segments.length <= 2) {
    return undefined;
  }

  return segments.slice(0, -1).join(".");
}

function isOntologyParticipatingRecord(
  record: RegistryRecord,
): record is OntologyParticipatingRecord {
  return (
    record.kind === "module" ||
    record.kind === "concept" ||
    record.kind === "model" ||
    record.kind === "paper" ||
    record.kind === "training-regime" ||
    record.kind === "system" ||
    record.kind === "dataset"
  );
}

function requiresPrimaryClassification(
  record: OntologyParticipatingRecord,
): boolean {
  return (
    record.kind === "module" ||
    recordsRequiringOntologyPrimaryClassification.has(record.id)
  );
}

function classificationMatchesPrefix(
  classificationId: string,
  prefix: string,
): boolean {
  return (
    classificationId === prefix || classificationId.startsWith(`${prefix}.`)
  );
}

function getTaxonomyExpectationForClassification(
  classificationId: string,
): OntologyTaxonomyExpectation | undefined {
  return taxonomyExpectationPrefixes.find(({ classificationIdPrefix }) =>
    classificationMatchesPrefix(classificationId, classificationIdPrefix),
  )?.expectation;
}

function getLegacyTaxonomyFieldValue(
  record: OntologyParticipatingRecord,
  field: string,
): string | undefined {
  const taxonomyCarrier = record as OntologyParticipatingRecord &
    Partial<Record<string, string>>;
  const value = taxonomyCarrier[field];
  return typeof value === "string" ? value : undefined;
}

function validateOntologyReferences(
  files: ParsedRegistryFile[],
  indexes: RegistryIndexes,
): void {
  const details: RegistryLoadErrorDetail[] = [];
  const normalizeClassificationId = (classificationId: string): string =>
    indexes.classificationsById.get(classificationId)?.id ?? classificationId;

  for (const { path, record } of files) {
    if (record.kind === "classification") {
      const classificationSegments = getClassificationNamespaceSegments(
        record.id,
      );
      if (!classificationSegments) {
        details.push({
          type: "parse-error",
          path,
          message: `classification id must use the canonical dotted namespace format, found "${record.id}"`,
        });
        continue;
      }

      const expectedParentClassificationId = getExpectedParentClassificationId(
        record.id,
      );
      const domain = classificationSegments[1];
      const expectedDomainKind = canonicalClassificationDomainKinds.get(domain);

      if (!expectedParentClassificationId && record.parentClassificationId) {
        details.push({
          type: "parse-error",
          path,
          message: `root classification "${record.id}" must not declare parentClassificationId`,
        });
      }

      if (expectedParentClassificationId && !record.parentClassificationId) {
        details.push({
          type: "parse-error",
          path,
          message: `classification "${record.id}" must declare parentClassificationId "${expectedParentClassificationId}"`,
        });
      }

      if (
        expectedDomainKind &&
        (record.classifiesKinds.length !== 1 ||
          record.classifiesKinds[0] !== expectedDomainKind)
      ) {
        details.push({
          type: "parse-error",
          path,
          message: `classification "${record.id}" must classify only "${expectedDomainKind}" records`,
        });
      }

      if (!record.parentClassificationId) {
        continue;
      }

      if (!classificationIdPattern.test(record.parentClassificationId)) {
        details.push({
          type: "parse-error",
          path,
          message: `parentClassificationId must use a canonical classification id, found "${record.parentClassificationId}"`,
        });
        continue;
      }

      const parent = indexes.byId.get(record.parentClassificationId);
      if (parent?.kind !== "classification") {
        details.push({
          type: "parse-error",
          path,
          message: `parentClassificationId must reference a classification record, found "${record.parentClassificationId}"`,
        });
        continue;
      }

      if (
        expectedParentClassificationId &&
        parent.id !== expectedParentClassificationId
      ) {
        details.push({
          type: "parse-error",
          path,
          message: `classification "${record.id}" must reference its direct namespace parent "${expectedParentClassificationId}", found "${parent.id}"`,
        });
      }

      const parentSegments = getClassificationNamespaceSegments(parent.id);
      if (parentSegments && classificationSegments[1] !== parentSegments[1]) {
        details.push({
          type: "parse-error",
          path,
          message: `classification "${record.id}" must stay within the "${classificationSegments[1]}" domain, found parent "${parent.id}"`,
        });
      }

      if (
        parent.classifiesKinds.length !== record.classifiesKinds.length ||
        parent.classifiesKinds.some(
          (classificationKind, index) =>
            classificationKind !== record.classifiesKinds[index],
        )
      ) {
        details.push({
          type: "parse-error",
          path,
          message: `classification "${record.id}" must match parent "${parent.id}" classifiesKinds`,
        });
      }
    }

    if (!isOntologyParticipatingRecord(record)) {
      continue;
    }

    const primaryClassificationId = record.primaryClassificationId;
    const secondaryClassificationIds = record.secondaryClassificationIds ?? [];
    const hasOntologyFields =
      primaryClassificationId !== undefined ||
      secondaryClassificationIds.length > 0 ||
      (record.relationships?.length ?? 0) > 0;

    if (
      (hasOntologyFields || requiresPrimaryClassification(record)) &&
      !primaryClassificationId
    ) {
      details.push({
        type: "parse-error",
        path,
        message: requiresPrimaryClassification(record)
          ? `record "${record.id}" requires primaryClassificationId under the ontology-first taxonomy contract`
          : "primaryClassificationId is required when a record opts into ontology membership or relationships",
      });
    }

    const seenClassificationIds = new Set<string>();
    if (primaryClassificationId) {
      seenClassificationIds.add(
        normalizeClassificationId(primaryClassificationId),
      );
    }

    for (const classificationId of secondaryClassificationIds) {
      const normalizedClassificationId =
        normalizeClassificationId(classificationId);
      if (seenClassificationIds.has(normalizedClassificationId)) {
        details.push({
          type: "parse-error",
          path,
          message:
            "secondaryClassificationIds must not repeat the primary classification or contain duplicates",
        });
        continue;
      }
      seenClassificationIds.add(normalizedClassificationId);
    }

    if (primaryClassificationId) {
      const primary = indexes.byId.get(primaryClassificationId);
      if (primary?.kind !== "classification") {
        details.push({
          type: "parse-error",
          path,
          message: `primaryClassificationId must reference a classification record, found "${primaryClassificationId}"`,
        });
      } else if (!primary.classifiesKinds.includes(record.kind)) {
        details.push({
          type: "parse-error",
          path,
          message: `primaryClassificationId "${primary.id}" cannot classify ${record.kind} records`,
        });
      } else {
        const expectation = getTaxonomyExpectationForClassification(primary.id);
        if (expectation) {
          const actualValue = getLegacyTaxonomyFieldValue(
            record,
            expectation.field,
          );
          if (
            actualValue !== undefined &&
            actualValue !== expectation.expectedValue
          ) {
            details.push({
              type: "parse-error",
              path,
              message: `primaryClassificationId "${primary.id}" conflicts with legacy taxonomy field ${expectation.field}="${actualValue}"; expected "${expectation.expectedValue}"`,
            });
          }
        }
      }
    }

    for (const classificationId of secondaryClassificationIds) {
      const classification = indexes.byId.get(classificationId);
      if (classification?.kind !== "classification") {
        details.push({
          type: "parse-error",
          path,
          message: `secondaryClassificationIds must reference classification records, found "${classificationId}"`,
        });
        continue;
      }

      if (!classification.classifiesKinds.includes(record.kind)) {
        details.push({
          type: "parse-error",
          path,
          message: `secondaryClassificationIds entry "${classification.id}" cannot classify ${record.kind} records`,
        });
      }
    }

    for (const relationship of record.relationships ?? []) {
      if (!indexes.byId.has(relationship.targetId)) {
        details.push({
          type: "parse-error",
          path,
          message: `relationships targetId references missing record "${relationship.targetId}"`,
        });
      }
    }
  }

  if (details.length > 0) {
    throw new RegistryLoadError(
      "Ontology reference validation failed",
      details,
    );
  }
}

export type LoadRegistryOptions = {
  registryRoot?: string;
};

export async function loadRegistry(
  options: LoadRegistryOptions = {},
): Promise<RegistryIndexes> {
  const registryRoot = options.registryRoot ?? defaultRegistryRoot;
  const files: ParsedRegistryFile[] = [];

  for (const directory of registryDirectories) {
    const parsed = await readRegistryDirectory(registryRoot, directory);
    files.push(...parsed);
  }

  const indexes = buildIndexes(files);
  validateOntologyReferences(files, indexes);
  return indexes;
}
