import type { ZodIssue } from "zod";
import { type GraphRecord, graphRecordSchema } from "@/lib/content/schemas";

export type GraphRegistryRecordSource = {
  sourcePath: string;
  value: unknown;
};

type GraphRegistryEntry = {
  record: GraphRecord;
  sourcePath: string;
};

function formatIssuePath(path: ZodIssue["path"]): string {
  return path.length === 0 ? "<root>" : path.join(".");
}

export function parseGraphRegistryRecord(
  sourcePath: string,
  value: unknown,
): GraphRecord {
  const parsed = graphRecordSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues
    .map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`)
    .join("; ");
  throw new Error(
    `Graph registry schema validation failed for ${sourcePath}: ${issues}`,
  );
}

export function parseGraphRegistryRecords(
  sources: readonly GraphRegistryRecordSource[],
): GraphRecord[] {
  const entries = sources.map(({ sourcePath, value }) => ({
    sourcePath,
    record: parseGraphRegistryRecord(sourcePath, value),
  }));

  assertUniqueGraphRegistryIds(entries);
  return entries.map(({ record }) => record);
}

export function assertUniqueGraphRegistryIds(
  entries: readonly GraphRegistryEntry[],
): void {
  const duplicateSourcesById = new Map<string, string[]>();

  for (const entry of entries) {
    const sources = duplicateSourcesById.get(entry.record.id);

    if (sources) {
      sources.push(entry.sourcePath);
      continue;
    }

    duplicateSourcesById.set(entry.record.id, [entry.sourcePath]);
  }

  for (const [graphId, sources] of duplicateSourcesById) {
    if (sources.length < 2) {
      continue;
    }

    throw new Error(
      `Duplicate graph registry id "${graphId}" found in: ${sources.join(", ")}`,
    );
  }
}
