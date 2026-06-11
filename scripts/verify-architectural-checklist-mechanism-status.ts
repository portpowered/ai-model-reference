import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatMechanismStatusVerificationIssues,
  verifyMechanismStatusArtifact,
} from "../src/lib/governance/architectural-checklist-audit";

const repoRoot = join(import.meta.dir, "..");
const checklistPath = join(repoRoot, "docs/architectural-checklist.md");
const artifactPath = join(
  repoRoot,
  "docs/governance/architectural-checklist-mechanism-status.md",
);

const checklistContent = readFileSync(checklistPath, "utf8");
const artifactContent = readFileSync(artifactPath, "utf8");
const result = verifyMechanismStatusArtifact(checklistContent, artifactContent);

console.log(formatMechanismStatusVerificationIssues(result.issues));

if (!result.ok) {
  process.exit(1);
}
