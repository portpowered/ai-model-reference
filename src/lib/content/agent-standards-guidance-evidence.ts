export const AGENT_STANDARDS_GUIDANCE_DOMAIN_ID =
  "agent-standards-guidance" as const;

export const AGENT_STANDARDS_GUIDANCE_DOMAIN_LABEL =
  "Agent and planner standards guidance (writing/graphing baseline)";

export const AGENT_STANDARDS_GUIDANCE_CHECKLIST_ROW =
  "agent-standards-guidance";

export type AgentStandardsGuidanceStatus = "pass" | "fail";

export type AgentStandardsGuidanceEvidence = {
  domainId: typeof AGENT_STANDARDS_GUIDANCE_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: AgentStandardsGuidanceStatus;
  reason?: string;
};

export type DeriveAgentStandardsGuidanceEvidenceInput = {
  rootAgentsMarkdown: string;
  ideafyAgentsMarkdown: string;
  writingStandardsMarkdown: string;
  graphingStandardsMarkdown: string;
};

const ROOT_AGENTS_REQUIRED_MARKERS = [
  /# writing docs/,
  /docs\/writing-standards\.md/,
  /docs\/graphing-standards\.md/,
  /Mandatory references/i,
] as const;

const IDEAFY_AGENTS_REQUIRED_MARKERS = [
  /docs\/writing-standards\.md/,
  /docs\/graphing-standards\.md/,
  /graph and math baseline convergence/i,
  /module\.graph-build-markers/,
  /module\.mha-gqa-comparison/,
  /module\.math-qkv-definitions/,
  /make verify-phase-1-github-pages-convergence/,
] as const;

const STANDARDS_LESSON_MARKERS = [
  /Lessons from prior GQA repair/,
  /comparison switcher/i,
  /zoom\/pan/i,
] as const;

function findMissingMarker(
  content: string,
  markers: readonly RegExp[],
): string | undefined {
  for (const marker of markers) {
    if (!marker.test(content)) {
      return marker.source;
    }
  }
  return undefined;
}

function buildEvidence(
  status: AgentStandardsGuidanceStatus,
  reason?: string,
): AgentStandardsGuidanceEvidence {
  return {
    domainId: AGENT_STANDARDS_GUIDANCE_DOMAIN_ID,
    label: AGENT_STANDARDS_GUIDANCE_DOMAIN_LABEL,
    checklistRow: AGENT_STANDARDS_GUIDANCE_CHECKLIST_ROW,
    status,
    reason,
  };
}

/**
 * Derives pass/fail evidence for agent and planner standards guidance from
 * captured markdown inputs (used by convergence and integration tests).
 */
export function deriveAgentStandardsGuidanceEvidence(
  input: DeriveAgentStandardsGuidanceEvidenceInput,
): AgentStandardsGuidanceEvidence {
  const rootMissing = findMissingMarker(
    input.rootAgentsMarkdown,
    ROOT_AGENTS_REQUIRED_MARKERS,
  );
  if (rootMissing) {
    return buildEvidence(
      "fail",
      `root AGENTS.md missing required marker: ${rootMissing}`,
    );
  }

  const ideafyMissing = findMissingMarker(
    input.ideafyAgentsMarkdown,
    IDEAFY_AGENTS_REQUIRED_MARKERS,
  );
  if (ideafyMissing) {
    return buildEvidence(
      "fail",
      `ideafy AGENTS.md missing required marker: ${ideafyMissing}`,
    );
  }

  const writingMissing = findMissingMarker(input.writingStandardsMarkdown, [
    STANDARDS_LESSON_MARKERS[0],
    /openingSummary/,
    /callouts\.readerShortcut/,
  ]);
  if (writingMissing) {
    return buildEvidence(
      "fail",
      `writing-standards.md missing required marker: ${writingMissing}`,
    );
  }

  const graphingMissing = findMissingMarker(
    input.graphingStandardsMarkdown,
    STANDARDS_LESSON_MARKERS,
  );
  if (graphingMissing) {
    return buildEvidence(
      "fail",
      `graphing-standards.md missing required marker: ${graphingMissing}`,
    );
  }

  return buildEvidence("pass");
}

export function formatAgentStandardsGuidanceEvidenceLine(
  evidence: AgentStandardsGuidanceEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}
