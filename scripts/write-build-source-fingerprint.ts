import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  computeBuildSourceFingerprint,
  writeBuildSourceFingerprint,
} from "../src/lib/verify/build-source-fingerprint";
import { hasCompleteNextProductionBuild } from "../src/lib/verify/server-lifecycle";

const projectRoot = process.cwd();

if (!hasCompleteNextProductionBuild(projectRoot)) {
  console.error(
    "Cannot write build source fingerprint: production build artifacts are incomplete. Run `bun run build` first.",
  );
  process.exit(1);
}

const fingerprint = writeBuildSourceFingerprint(projectRoot);
console.log(
  `Wrote ${join(projectRoot, ".next/verify-build-source-fingerprint")} (${fingerprint.slice(0, 32)}…).`,
);

if (fingerprint !== computeBuildSourceFingerprint(projectRoot)) {
  console.error("Build source fingerprint mismatch immediately after write.");
  process.exit(1);
}

if (!existsSync(join(projectRoot, ".next"))) {
  console.error("Expected .next directory after build.");
  process.exit(1);
}
