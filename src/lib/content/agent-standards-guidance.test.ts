import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deriveAgentStandardsGuidanceEvidence,
  formatAgentStandardsGuidanceEvidenceLine,
} from "@/lib/content/agent-standards-guidance-evidence";

const repoRoot = join(import.meta.dir, "../../..");
const rootAgentsPath = join(repoRoot, "AGENTS.md");
const ideafyAgentsPath = join(
  repoRoot,
  "factory/workstations/ideafy/AGENTS.md",
);
const writingStandardsPath = join(repoRoot, "docs/writing-standards.md");
const graphingStandardsPath = join(repoRoot, "docs/graphing-standards.md");

function loadAgentStandardsInputs() {
  return {
    rootAgentsMarkdown: readFileSync(rootAgentsPath, "utf8"),
    ideafyAgentsMarkdown: readFileSync(ideafyAgentsPath, "utf8"),
    writingStandardsMarkdown: readFileSync(writingStandardsPath, "utf8"),
    graphingStandardsMarkdown: readFileSync(graphingStandardsPath, "utf8"),
  };
}

describe("agent and planner standards guidance", () => {
  test("deriveAgentStandardsGuidanceEvidence passes for repository guidance files", () => {
    const evidence = deriveAgentStandardsGuidanceEvidence(
      loadAgentStandardsInputs(),
    );

    expect(evidence.status).toBe("pass");
    expect(formatAgentStandardsGuidanceEvidenceLine(evidence)).toContain(
      "[PASS] agent-standards-guidance",
    );
  });

  test("deriveAgentStandardsGuidanceEvidence fails when mandatory standards links are removed", () => {
    const inputs = loadAgentStandardsInputs();
    const evidence = deriveAgentStandardsGuidanceEvidence({
      ...inputs,
      rootAgentsMarkdown: inputs.rootAgentsMarkdown.replace(
        /docs\/graphing-standards\.md/g,
        "",
      ),
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("root AGENTS.md missing required marker");
  });

  test("deriveAgentStandardsGuidanceEvidence fails when ideafy convergence brief is stripped", () => {
    const inputs = loadAgentStandardsInputs();
    const evidence = deriveAgentStandardsGuidanceEvidence({
      ...inputs,
      ideafyAgentsMarkdown: inputs.ideafyAgentsMarkdown.replace(
        /module\.mha-gqa-comparison/g,
        "",
      ),
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain(
      "ideafy AGENTS.md missing required marker",
    );
  });
});
