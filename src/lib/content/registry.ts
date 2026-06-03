import groupedQueryAttention from "@/content/registry/modules/grouped-query-attention.json";
import { type ModuleRecord, moduleRecordSchema } from "@/lib/content/schemas";

const moduleRecords: ModuleRecord[] = [
  moduleRecordSchema.parse(groupedQueryAttention),
];

const modulesById = new Map(moduleRecords.map((record) => [record.id, record]));

export function getModuleById(registryId: string): ModuleRecord | undefined {
  return modulesById.get(registryId);
}

export function listModuleRecords(): ModuleRecord[] {
  return [...moduleRecords];
}

/** Tags declared on a registry record, when the record exists. */
export function getRegistryTags(registryId: string): string[] | undefined {
  const module = getModuleById(registryId);
  if (module) {
    return module.tags;
  }
  return undefined;
}

/** Citation IDs declared on a module registry record, when the record exists. */
export function getRegistryCitationIds(
  registryId: string,
): string[] | undefined {
  const module = getModuleById(registryId);
  if (module) {
    return module.citationIds;
  }
  return undefined;
}
