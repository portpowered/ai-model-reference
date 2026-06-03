import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type CitationRecord,
  type ConceptRecord,
  citationRecordSchema,
  conceptRecordSchema,
  type GraphRecord,
  graphRecordSchema,
  type ModuleRecord,
  moduleRecordSchema,
  type TagRecord,
  tagRecordSchema,
} from "./schemas";

export type RegistryRecord =
  | ModuleRecord
  | ConceptRecord
  | TagRecord
  | CitationRecord
  | GraphRecord;

export type RegistryIndexes = {
  byId: Map<string, RegistryRecord>;
  bySlug: Map<string, RegistryRecord>;
  tagsById: Map<string, TagRecord>;
  tagsBySlug: Map<string, TagRecord>;
};

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

const defaultRegistryRoot = join(process.cwd(), "src/content/registry");

type RegistryDirectory = {
  name: "modules" | "concepts" | "tags" | "citations" | "graphs";
  schema:
    | typeof moduleRecordSchema
    | typeof conceptRecordSchema
    | typeof tagRecordSchema
    | typeof citationRecordSchema
    | typeof graphRecordSchema;
};

const registryDirectories: RegistryDirectory[] = [
  { name: "modules", schema: moduleRecordSchema },
  { name: "concepts", schema: conceptRecordSchema },
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
  const slugPaths = new Map<string, string[]>();

  for (const { path, record } of files) {
    const existingIdPaths = idPaths.get(record.id) ?? [];
    existingIdPaths.push(path);
    idPaths.set(record.id, existingIdPaths);

    const existingSlugPaths = slugPaths.get(record.slug) ?? [];
    existingSlugPaths.push(path);
    slugPaths.set(record.slug, existingSlugPaths);

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
  for (const [slug, paths] of slugPaths) {
    if (paths.length > 1) {
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

export function getRegistryRecord(
  indexes: RegistryIndexes,
  registryId?: string,
): RegistryRecord | undefined {
  if (!registryId) {
    return undefined;
  }
  return indexes.byId.get(registryId);
}
