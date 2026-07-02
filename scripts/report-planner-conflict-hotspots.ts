import { resolve } from "node:path";
import {
  ConflictHotspotCollectionError,
  collectConflictHotspotSnapshot,
  formatConflictHotspotSnapshot,
} from "../src/lib/factory/conflict-hotspot-report";

const defaultRepoRoot = resolve(import.meta.dir, "..");
const repoRoot = process.argv[2] ? resolve(process.argv[2]) : defaultRepoRoot;

try {
  const snapshot = collectConflictHotspotSnapshot(repoRoot);
  console.log(formatConflictHotspotSnapshot(snapshot));
} catch (error) {
  console.error("Planner conflict-hotspot report failed.");
  if (error instanceof ConflictHotspotCollectionError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
