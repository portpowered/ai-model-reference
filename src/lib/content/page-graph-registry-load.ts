import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { registerGraphRecords } from "@/lib/content/graph-registry-runtime";
import {
  type GraphRecord,
  graphRecordSchema,
  type PageAssetConfig,
} from "@/lib/content/schemas";

function collectPageGraphIds(assets: PageAssetConfig): string[] {
  const graphIds = new Set<string>();

  for (const asset of Object.values(assets)) {
    if (asset.type === "graph") {
      graphIds.add(asset.graphId);
      continue;
    }

    if (asset.type === "attention-variant-graph") {
      for (const variant of asset.variants) {
        graphIds.add(variant.graphId);
      }
    }
  }

  return [...graphIds];
}

function graphPathFromId(contentRoot: string, graphId: string): string {
  const slug = graphId.startsWith("graph.")
    ? graphId.slice("graph.".length)
    : graphId;
  return join(contentRoot, "registry", "graphs", `${slug}.json`);
}

export function registerPageGraphRecords(
  contentRoot: string,
  assets: PageAssetConfig,
): GraphRecord[] {
  const records: GraphRecord[] = [];

  for (const graphId of collectPageGraphIds(assets)) {
    const path = graphPathFromId(contentRoot, graphId);
    if (!existsSync(path)) {
      continue;
    }

    const record = graphRecordSchema.parse(
      JSON.parse(readFileSync(path, "utf8")) as unknown,
    );
    records.push(record);
  }

  registerGraphRecords(records);
  return records;
}
