import {
  collectPlannerBatchCollisionPreflightSnapshot,
  formatPlannerBatchCollisionPreflightSnapshot,
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

try {
  const snapshot = collectPlannerBatchCollisionPreflightSnapshot(candidateArgs);

  if (format === "json") {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    console.log(formatPlannerBatchCollisionPreflightSnapshot(snapshot));
  }
} catch (error) {
  console.error("Planner batch collision preflight failed.");
  if (error instanceof PlannerBatchCollisionPreflightInputError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
