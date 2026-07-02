import { join } from "node:path";
import {
  getGeneratedContentRuntimeRoot,
  getProjectRoot,
  getRegistryRoot,
} from "../src/lib/content/content-paths";
import { writeGeneratedRegistryRuntimeModule } from "../src/lib/content/registry-runtime-generation";

const projectRoot = getProjectRoot();
const outputPath = join(
  getGeneratedContentRuntimeRoot(projectRoot),
  "registry-runtime.generated.ts",
);
const registryRoot = getRegistryRoot();

const result = await writeGeneratedRegistryRuntimeModule({
  outputPath,
  projectRoot,
  registryRoot,
});

console.log(
  `${result.changed ? "Generated" : "Verified"} ${outputPath.replace(
    `${projectRoot}/`,
    "",
  )} from ${registryRoot.replace(`${projectRoot}/`, "")}.`,
);
