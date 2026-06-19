import { join } from "node:path";
import { writeGeneratedRegistryRuntimeModule } from "../src/lib/content/registry-runtime-generation";

const projectRoot = process.cwd();
const outputPath = join(
  projectRoot,
  "src",
  "lib",
  "content",
  "registry-runtime.generated.ts",
);
const registryRoot = join(projectRoot, "src", "content", "registry");

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
