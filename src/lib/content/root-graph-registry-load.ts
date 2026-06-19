import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_ROOT } from "@/lib/content/content-paths";
import {
  clearRegisteredGraphRecords,
  registerGraphRecords,
} from "@/lib/content/graph-registry-runtime";
import { parseGraphRegistryRecords } from "@/lib/content/graph-registry-validation";
import type { GraphRecord } from "@/lib/content/schemas";

function readGraphRecords(contentRoot: string): GraphRecord[] {
  const graphsRoot = join(contentRoot, "registry", "graphs");
  const graphFileNames = readdirSync(graphsRoot)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return parseGraphRegistryRecords(
    graphFileNames.map((fileName) => ({
      sourcePath: join(graphsRoot, fileName),
      value: JSON.parse(readFileSync(join(graphsRoot, fileName), "utf8")),
    })),
  );
}

export function syncGraphRegistryForContentRoot(contentRoot: string): void {
  if (contentRoot === CONTENT_ROOT) {
    clearRegisteredGraphRecords();
    return;
  }

  const records = readGraphRecords(contentRoot);
  clearRegisteredGraphRecords();
  registerGraphRecords(records);
}
