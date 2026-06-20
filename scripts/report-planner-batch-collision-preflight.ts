import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ConflictHotspotSnapshot } from "../src/lib/factory/conflict-hotspot-report";
import {
  collectPlannerBatchCollisionPreflightSnapshot,
  formatPlannerBatchCollisionPreflightSnapshot,
  PlannerBatchCollisionPreflightCollectionError,
  PlannerBatchCollisionPreflightInputError,
} from "../src/lib/factory/planner-batch-collision-preflight";

function readFlagValues(flag: string): string[] {
  const values: string[] = [];

  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag) {
      const value = process.argv[index + 1];
      if (value) {
        values.push(value);
      }
    }
  }

  return values;
}

function readFlagValue(flag: string): string | undefined {
  const values = readFlagValues(flag);
  return values.at(-1);
}

const candidateArgs = readFlagValues("--candidate");
const format = readFlagValue("--format") ?? "summary";
const hotspotSnapshotJson = readFlagValue("--hotspot-snapshot-json");

function readHotspotSnapshot(
  snapshotPath: string | undefined,
): ConflictHotspotSnapshot | undefined {
  if (!snapshotPath) {
    return undefined;
  }

  return JSON.parse(
    readFileSync(resolve(snapshotPath), "utf8"),
  ) as ConflictHotspotSnapshot;
}

try {
  const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
    candidateArgs,
    {
      hotspotSnapshot: readHotspotSnapshot(hotspotSnapshotJson),
      repoRoot: process.cwd(),
    },
  );

  if (format === "json") {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    console.log(formatPlannerBatchCollisionPreflightSnapshot(snapshot));
  }
} catch (error) {
  console.error("Planner batch collision preflight failed.");
  if (error instanceof PlannerBatchCollisionPreflightInputError) {
    console.error(error.message);
  } else if (error instanceof PlannerBatchCollisionPreflightCollectionError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
