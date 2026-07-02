import { type TableRecord, tableRecordSchema } from "@/lib/content/schemas";
import {
  createTableRegistrySourceEntries,
  renderGeneratedTableRegistryModule,
} from "@/lib/content/table-registry-generation";

export type TableRegistrySourceRecord = {
  fileName: string;
  record: unknown;
};

export type TableRegistryVerificationInput = {
  sourceRecords: readonly TableRegistrySourceRecord[];
  generatedModuleSource: string | null;
  runtimeTableRecords: readonly TableRecord[];
};

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function formatIdList(ids: readonly string[]): string {
  return ids.length === 0 ? "(none)" : ids.join(", ");
}

export function verifyGeneratedTableRegistryState(
  input: TableRegistryVerificationInput,
): string[] {
  const problems: string[] = [];
  const expectedEntries = createTableRegistrySourceEntries(
    input.sourceRecords.map((record) => record.fileName),
  );
  const expectedModuleSource =
    renderGeneratedTableRegistryModule(expectedEntries);

  if (input.generatedModuleSource === null) {
    problems.push(
      "Missing generated table registry module at `src/lib/content/generated/table-registry.generated.ts`. Run `bun run generate:table-registry` and commit the result.",
    );
  } else if (input.generatedModuleSource !== expectedModuleSource) {
    problems.push(
      "Generated table registry module is out of sync with `src/content/registry/tables`. Run `bun run generate:table-registry` and commit the updated file.",
    );
  }

  const recordsByFileName = new Map(
    input.sourceRecords.map((record) => [record.fileName, record.record]),
  );
  const expectedTableIds = expectedEntries.map((entry) => {
    const rawRecord = recordsByFileName.get(entry.fileName);
    return tableRecordSchema.parse(rawRecord).id;
  });
  const runtimeTableIds = input.runtimeTableRecords.map(
    (record) => tableRecordSchema.parse(record).id,
  );

  if (!arraysEqual(runtimeTableIds, expectedTableIds)) {
    problems.push(
      `Synchronous table runtime does not expose the same table ids as the on-disk registry. Expected: ${formatIdList(expectedTableIds)}. Received: ${formatIdList(runtimeTableIds)}.`,
    );
  }

  return problems;
}
