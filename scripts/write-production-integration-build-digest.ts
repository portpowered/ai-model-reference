import { join } from "node:path";
import { writeProductionIntegrationBuildDigest } from "../src/lib/verify/production-integration-build-trust";

const projectRoot = join(import.meta.dir, "..");

try {
  const digest = writeProductionIntegrationBuildDigest(projectRoot);
  console.log(
    `Wrote production integration build digest to .next/${"verify-production-integration-build-digest"} (${digest.slice(0, 12)}…)`,
  );
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
