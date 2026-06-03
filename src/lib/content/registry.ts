import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { type RegistryRecord, registryRecordSchema } from "./schemas";

const REGISTRY_ROOT = path.join(process.cwd(), "src/content/registry");

function readRegistryFiles(dir: string): RegistryRecord[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const records: RegistryRecord[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "messages") {
        continue;
      }
      records.push(...readRegistryFiles(fullPath));
      continue;
    }
    if (!entry.name.endsWith(".json")) {
      continue;
    }
    const raw = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    records.push(registryRecordSchema.parse(raw));
  }

  return records;
}

export type RegistryStore = {
  records: RegistryRecord[];
  byId: Map<string, RegistryRecord>;
};

export function loadRegistry(rootDir = REGISTRY_ROOT): RegistryStore {
  const records = readRegistryFiles(rootDir);
  const byId = new Map(records.map((record) => [record.id, record]));
  return { records, byId };
}

export function getRegistryRecord(
  store: RegistryStore,
  id: string,
): RegistryRecord | undefined {
  return store.byId.get(id);
}
