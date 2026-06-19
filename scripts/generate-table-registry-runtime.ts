import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  getContentRoot,
  getProjectRoot,
  getRegistryRoot,
} from "@/lib/content/content-paths";
import {
  createTableRegistrySourceEntries,
  renderGeneratedTableRegistryModule,
} from "@/lib/content/table-registry-generation";

const projectRoot = getProjectRoot();
const tablesRegistryRoot = join(
  getRegistryRoot(getContentRoot(projectRoot)),
  "tables",
);
const outputPath = join(
  projectRoot,
  "src/lib/content/generated/table-registry.generated.ts",
);

async function main(): Promise<void> {
  const fileNames = await readdir(tablesRegistryRoot);
  const entries = createTableRegistrySourceEntries(fileNames);
  const output = renderGeneratedTableRegistryModule(entries);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
}

await main();
