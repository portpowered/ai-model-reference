import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { REGISTRY_ROOT } from "./content-paths";
import type { RegistryIndexes, RegistryRecord } from "./registry-index";
import {
  citationRecordSchema,
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
  name:
    | "modules"
    | "concepts"
    | "models"
    | "papers"
    | "training-regimes"
    | "systems"
    | "datasets"
    | "organizations"
    | "tags"
    | "citations"
    | "graphs";
  schema:
    | typeof moduleRecordSchema
    | typeof conceptRecordSchema
    | typeof modelRecordSchema
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
  const directoryPath = join(registryRoot, directory.name);
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

    parsed.push({ path, record: result.data });
  }

  return parsed;
}

function buildIndexes(files: ParsedRegistryFile[]): RegistryIndexes {
  const byId = new Map<string, RegistryRecord>();
  const bySlug = new Map<string, RegistryRecord>();
  const tagsById = new Map<string, TagRecord>();
  const tagsBySlug = new Map<string, TagRecord>();
  const idPaths = new Map<string, string[]>();
  const slugPathsByKind = new Map<string, string[]>();

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

  if (details.length > 0) {
    throw new RegistryLoadError(
      "Duplicate registry id or slug detected",
      details,
    );
  }

  return { byId, bySlug, tagsById, tagsBySlug };
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

  return buildIndexes(files);
}
