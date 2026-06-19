import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  getContentRoot,
  getProjectRoot,
  getRegistryRoot,
} from "@/lib/content/content-paths";
import type { TableRecord } from "@/lib/content/schemas";
import { verifyGeneratedTableRegistryState } from "@/lib/content/table-registry-verification";

const projectRoot = getProjectRoot();
const contentRoot = getContentRoot(projectRoot);
const tablesRegistryRoot = join(getRegistryRoot(contentRoot), "tables");
const generatedModulePath = join(
  projectRoot,
  "src/lib/content/generated/table-registry.generated.ts",
);
const runtimeModulePath = join(
  projectRoot,
  "src/lib/content/table-registry-runtime.ts",
);

async function loadSourceRecords() {
  const fileNames = (await readdir(tablesRegistryRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    fileNames.map(async (fileName) => ({
      fileName,
      record: JSON.parse(
        await readFile(join(tablesRegistryRoot, fileName), "utf8"),
      ) as unknown,
    })),
  );
}

async function loadRuntimeTableRecords(): Promise<TableRecord[]> {
  const runtimeModuleUrl = pathToFileURL(runtimeModulePath);
  runtimeModuleUrl.searchParams.set("ts", Date.now().toString());
  const runtimeModule = (await import(runtimeModuleUrl.href)) as {
    listTableRecords: () => TableRecord[];
  };

  return runtimeModule.listTableRecords();
}

async function main(): Promise<void> {
  const sourceRecords = await loadSourceRecords();
  const generatedModuleSource = existsSync(generatedModulePath)
    ? await readFile(generatedModulePath, "utf8")
    : null;

  const problems: string[] = [];
  let runtimeTableRecords: TableRecord[] = [];

  if (generatedModuleSource !== null) {
    try {
      runtimeTableRecords = await loadRuntimeTableRecords();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      problems.push(
        `Failed to load the synchronous table registry runtime. Regenerate the table registry and ensure all table records are valid. Details: ${message}`,
      );
    }
  }

  problems.push(
    ...verifyGeneratedTableRegistryState({
      sourceRecords,
      generatedModuleSource,
      runtimeTableRecords,
    }),
  );

  if (problems.length > 0) {
    console.error("Table registry runtime verification failed:");
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }
}

await main();
