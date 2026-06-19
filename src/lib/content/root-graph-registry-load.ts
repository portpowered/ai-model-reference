import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_ROOT } from "@/lib/content/content-paths";
import {
  clearRegisteredGraphRecords,
  registerGraphRecords,
} from "@/lib/content/graph-registry-runtime";
import { type GraphRecord, graphRecordSchema } from "@/lib/content/schemas";

function readGraphRecords(contentRoot: string): GraphRecord[] {
  const graphsRoot = join(contentRoot, "registry", "graphs");

  return readdirSync(graphsRoot)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) =>
      graphRecordSchema.parse(
        JSON.parse(readFileSync(join(graphsRoot, fileName), "utf8")) as unknown,
      ),
    );
}

export function syncGraphRegistryForContentRoot(contentRoot: string): void {
  if (contentRoot === CONTENT_ROOT) {
    return;
  }

  clearRegisteredGraphRecords();
  registerGraphRecords(readGraphRecords(contentRoot));
}
