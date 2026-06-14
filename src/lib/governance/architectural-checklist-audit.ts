export const ALLOWED_MECHANISM_STATUSES = [
  "implemented",
  "partially implemented",
  "missing",
] as const;

export type MechanismStatus = (typeof ALLOWED_MECHANISM_STATUSES)[number];

export type MechanismStatusCategoryEntry = {
  category: string;
  status: MechanismStatus;
  repositoryEvidence: string;
};

export type MechanismStatusVerificationIssue = {
  category?: string;
  message: string;
};

export type MechanismStatusVerificationResult = {
  ok: boolean;
  issues: MechanismStatusVerificationIssue[];
};

const CHECKLIST_NOTES_HEADING = "Notes:";
const WEBSITE_FUNDAMENTALS_HEADING = "Website fundamentals";
const WEBSITE_SPECIFIC_DECISIONS_HEADING = "Website-specific decisions";
const OPERATIONAL_SUBSECTION = "Operational";

const REQUIRED_ARTIFACT_SECTIONS = [
  "## Operator and manual requirements",
  "## Phase 1 boundaries and deferred mechanisms",
  "## Reviewer commands",
] as const;

const REQUIRED_CONTRACT_SECTIONS = [
  "## Status values",
  "## Evidence rule",
  "## Required fields per category",
] as const;

const REQUIRED_OPERATOR_CONTROL_MARKERS = [
  "GitHub branch protection",
  "Environment secrets",
  "Preview deployment infrastructure",
  "Production hosting configuration",
] as const;

const REQUIRED_WORKFLOW_EVIDENCE_MARKERS = [
  "#### `.github/workflows/ci.yml`",
  "#### `.github/workflows/deploy.yml`",
] as const;

const REQUIRED_PHASE_BOUNDARY_MARKERS = [
  "### Current localization posture",
  "### Intentionally deferred mechanisms",
  "English only",
  "Locale-prefixed routes",
  "preview deployments",
  "Storybook",
  "Lighthouse",
  "PDF Export Contract",
  "Blog Components Contract",
] as const;

const CATEGORY_ENTRY_HEADING = /^### (.+)$/;
const TABLE_ROW_PATTERN = /^\|\s\*\*(.+?)\*\*\s\|\s(.+?)\s\|$/;

/**
 * Extracts auditable checklist category paths from architectural-checklist.md.
 * Nested Operational rolls up as `Website fundamentals > Operational`.
 * Sections under `# Website-specific decisions` roll up as
 * `Website-specific decisions > {section}`.
 */
export function extractAuditableCategoriesFromChecklist(
  checklistContent: string,
): string[] {
  const categories: string[] = [];
  let inWebsiteSpecificDecisions = false;
  let inWebsiteFundamentals = false;

  for (const line of checklistContent.split("\n")) {
    if (/^#\s+Website-specific decisions\b/.test(line)) {
      inWebsiteSpecificDecisions = true;
      inWebsiteFundamentals = false;
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      const heading = h2Match[1]?.trim() ?? "";
      if (heading === CHECKLIST_NOTES_HEADING) {
        inWebsiteFundamentals = false;
        continue;
      }

      if (inWebsiteSpecificDecisions) {
        categories.push(`${WEBSITE_SPECIFIC_DECISIONS_HEADING} > ${heading}`);
        continue;
      }

      if (heading === WEBSITE_FUNDAMENTALS_HEADING) {
        inWebsiteFundamentals = true;
        continue;
      }

      inWebsiteFundamentals = false;
      categories.push(heading);
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match && inWebsiteFundamentals) {
      const subsection = h3Match[1]?.trim() ?? "";
      if (subsection === OPERATIONAL_SUBSECTION) {
        categories.push(
          `${WEBSITE_FUNDAMENTALS_HEADING} > ${OPERATIONAL_SUBSECTION}`,
        );
      }
    }
  }

  return categories;
}

function normalizeFieldValue(value: string): string {
  return value.trim();
}

function parseStatus(value: string): MechanismStatus | null {
  const normalized = normalizeFieldValue(value).toLowerCase();
  return (
    ALLOWED_MECHANISM_STATUSES.find((status) => status === normalized) ?? null
  );
}

function hasRepositoryEvidence(value: string): boolean {
  const normalized = normalizeFieldValue(value).toLowerCase();
  return normalized.length > 0 && normalized !== "none" && normalized !== "n/a";
}

/**
 * Parses category entry tables from the mechanism-status artifact.
 */
export function parseMechanismStatusCategoryEntries(
  artifactContent: string,
): MechanismStatusCategoryEntry[] {
  const categoryEntriesIndex = artifactContent.indexOf("## Category entries");
  if (categoryEntriesIndex === -1) {
    return [];
  }

  const reviewerCommandsIndex = artifactContent.indexOf(
    "## Reviewer commands",
    categoryEntriesIndex,
  );
  const categorySection =
    reviewerCommandsIndex === -1
      ? artifactContent.slice(categoryEntriesIndex)
      : artifactContent.slice(categoryEntriesIndex, reviewerCommandsIndex);

  const entries: MechanismStatusCategoryEntry[] = [];
  let currentCategory: string | null = null;
  let currentStatus: MechanismStatus | null = null;
  let currentEvidence = "";

  const flushEntry = () => {
    if (!currentCategory || !currentStatus) {
      return;
    }

    entries.push({
      category: currentCategory,
      status: currentStatus,
      repositoryEvidence: currentEvidence,
    });
  };

  for (const line of categorySection.split("\n")) {
    const categoryMatch = line.match(CATEGORY_ENTRY_HEADING);
    if (categoryMatch) {
      flushEntry();
      currentCategory = categoryMatch[1]?.trim() ?? "";
      currentStatus = null;
      currentEvidence = "";
      continue;
    }

    const rowMatch = line.match(TABLE_ROW_PATTERN);
    if (!rowMatch || !currentCategory) {
      continue;
    }

    const field = normalizeFieldValue(rowMatch[1] ?? "");
    const value = normalizeFieldValue(rowMatch[2] ?? "");

    if (field === "Status") {
      currentStatus = parseStatus(value);
    }

    if (field === "Repository evidence") {
      currentEvidence = value;
    }
  }

  flushEntry();
  return entries;
}

export function verifyMechanismStatusArtifact(
  checklistContent: string,
  artifactContent: string,
): MechanismStatusVerificationResult {
  const issues: MechanismStatusVerificationIssue[] = [];
  const expectedCategories =
    extractAuditableCategoriesFromChecklist(checklistContent);
  const entries = parseMechanismStatusCategoryEntries(artifactContent);
  const entriesByCategory = new Map(
    entries.map((entry) => [entry.category, entry]),
  );

  for (const sectionHeading of REQUIRED_ARTIFACT_SECTIONS) {
    if (!artifactContent.includes(sectionHeading)) {
      issues.push({
        message: `Mechanism-status artifact is missing required section: ${sectionHeading}`,
      });
    }
  }

  for (const sectionHeading of REQUIRED_CONTRACT_SECTIONS) {
    if (!artifactContent.includes(sectionHeading)) {
      issues.push({
        message: `Mechanism-status artifact is missing contract section: ${sectionHeading}`,
      });
    }
  }

  for (const status of ALLOWED_MECHANISM_STATUSES) {
    if (!artifactContent.includes(`**${status}**`)) {
      issues.push({
        message: `Mechanism-status artifact contract must document status value: ${status}`,
      });
    }
  }

  const operatorSectionIndex = artifactContent.indexOf(
    "## Operator and manual requirements",
  );
  if (operatorSectionIndex >= 0) {
    const afterOperatorHeading = artifactContent.slice(
      operatorSectionIndex + "## Operator and manual requirements".length,
    );
    const nextSectionOffset = afterOperatorHeading.search(/\n## [^#]/);
    const operatorSection =
      nextSectionOffset === -1
        ? artifactContent.slice(operatorSectionIndex)
        : artifactContent.slice(
            operatorSectionIndex,
            operatorSectionIndex +
              "## Operator and manual requirements".length +
              nextSectionOffset,
          );
    for (const marker of REQUIRED_OPERATOR_CONTROL_MARKERS) {
      if (!operatorSection.includes(marker)) {
        issues.push({
          message: `Operator/manual requirements must document control: ${marker}`,
        });
      }
    }

    for (const marker of REQUIRED_WORKFLOW_EVIDENCE_MARKERS) {
      if (!operatorSection.includes(marker)) {
        issues.push({
          message: `Operator/manual requirements must describe workflow evidence: ${marker}`,
        });
      }
    }
  }

  const phaseBoundariesIndex = artifactContent.indexOf(
    "## Phase 1 boundaries and deferred mechanisms",
  );
  if (phaseBoundariesIndex >= 0) {
    const afterPhaseBoundariesHeading = artifactContent.slice(
      phaseBoundariesIndex +
        "## Phase 1 boundaries and deferred mechanisms".length,
    );
    const nextSectionOffset = afterPhaseBoundariesHeading.search(/\n## [^#]/);
    const phaseBoundariesSection =
      nextSectionOffset === -1
        ? artifactContent.slice(phaseBoundariesIndex)
        : artifactContent.slice(
            phaseBoundariesIndex,
            phaseBoundariesIndex +
              "## Phase 1 boundaries and deferred mechanisms".length +
              nextSectionOffset,
          );
    for (const marker of REQUIRED_PHASE_BOUNDARY_MARKERS) {
      if (!phaseBoundariesSection.includes(marker)) {
        issues.push({
          message: `Phase 1 boundaries must document deferred scope marker: ${marker}`,
        });
      }
    }
  }

  for (const category of expectedCategories) {
    const entry = entriesByCategory.get(category);
    if (!entry) {
      issues.push({
        category,
        message: `Missing category entry for checklist section: ${category}`,
      });
      continue;
    }

    if (!ALLOWED_MECHANISM_STATUSES.includes(entry.status)) {
      issues.push({
        category,
        message: `Category ${category} uses disallowed status: ${entry.status}`,
      });
    }

    if (
      (entry.status === "implemented" ||
        entry.status === "partially implemented") &&
      !hasRepositoryEvidence(entry.repositoryEvidence)
    ) {
      issues.push({
        category,
        message: `Category ${category} is marked ${entry.status} but lacks repository evidence`,
      });
    }
  }

  const expectedSet = new Set(expectedCategories);
  for (const entry of entries) {
    if (!expectedSet.has(entry.category)) {
      issues.push({
        category: entry.category,
        message: `Artifact contains unexpected category entry: ${entry.category}`,
      });
    }
  }

  const duplicateCategories = entries
    .map((entry) => entry.category)
    .filter((category, index, all) => all.indexOf(category) !== index);
  for (const category of new Set(duplicateCategories)) {
    issues.push({
      category,
      message: `Category ${category} appears more than once in the artifact`,
    });
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function formatMechanismStatusVerificationIssues(
  issues: MechanismStatusVerificationIssue[],
): string {
  if (issues.length === 0) {
    return "Architectural checklist mechanism-status artifact verification passed.";
  }

  return [
    "Architectural checklist mechanism-status artifact verification failed:",
    ...issues.map((issue) => {
      if (issue.category) {
        return `- [${issue.category}] ${issue.message}`;
      }
      return `- ${issue.message}`;
    }),
  ].join("\n");
}
