import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractAuditableCategoriesFromChecklist,
  formatMechanismStatusVerificationIssues,
  parseMechanismStatusCategoryEntries,
  verifyMechanismStatusArtifact,
} from "@/lib/governance/architectural-checklist-audit";

const repoRoot = join(import.meta.dir, "../../..");
const checklistPath = join(repoRoot, "docs/architectural-checklist.md");
const artifactPath = join(
  repoRoot,
  "docs/governance/architectural-checklist-mechanism-status.md",
);

describe("extractAuditableCategoriesFromChecklist", () => {
  test("maps nested Operational and website-specific sections to category paths", () => {
    const sample = `
## Notes:
- intro

## Website fundamentals

### Operational

* deploy

## Testing

* tests

# Website-specific decisions

## Technology decisions

* next
`;

    expect(extractAuditableCategoriesFromChecklist(sample)).toEqual([
      "Website fundamentals > Operational",
      "Testing",
      "Website-specific decisions > Technology decisions",
    ]);
  });
});

describe("parseMechanismStatusCategoryEntries", () => {
  test("reads status and repository evidence from category tables", () => {
    const sample = `
## Category entries

### Testing

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Repository evidence** | \`src/tests/**\` |

### Accessibility

| Field | Value |
| --- | --- |
| **Status** | missing |
| **Repository evidence** | none |

## Reviewer commands
`;

    expect(parseMechanismStatusCategoryEntries(sample)).toEqual([
      {
        category: "Testing",
        status: "partially implemented",
        repositoryEvidence: "`src/tests/**`",
      },
      {
        category: "Accessibility",
        status: "missing",
        repositoryEvidence: "none",
      },
    ]);
  });
});

describe("verifyMechanismStatusArtifact", () => {
  test("passes on the current repository checklist and artifact", () => {
    const checklistContent = readFileSync(checklistPath, "utf8");
    const artifactContent = readFileSync(artifactPath, "utf8");
    const result = verifyMechanismStatusArtifact(
      checklistContent,
      artifactContent,
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("fails when a checklist category is missing from the artifact", () => {
    const checklist = `
## Testing

* item
`;
    const artifact = `
## Operator and manual requirements

## Category entries

## Reviewer commands
`;

    const result = verifyMechanismStatusArtifact(checklist, artifact);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.category === "Testing")).toBe(
      true,
    );
  });

  test("fails when implemented categories lack repository evidence", () => {
    const checklist = `
## Testing

* item
`;
    const artifact = `
## Operator and manual requirements

## Category entries

### Testing

| Field | Value |
| --- | --- |
| **Status** | implemented |
| **Repository evidence** | none |

## Reviewer commands
`;

    const result = verifyMechanismStatusArtifact(checklist, artifact);

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("lacks repository evidence"),
      ),
    ).toBe(true);
  });

  test("formatMechanismStatusVerificationIssues lists category-scoped failures", () => {
    const formatted = formatMechanismStatusVerificationIssues([
      {
        category: "Testing",
        message: "Missing category entry for checklist section: Testing",
      },
    ]);

    expect(formatted).toContain("[Testing]");
    expect(formatted).toContain("verification failed");
  });

  test("fails when contract sections are removed from the artifact", () => {
    const checklistContent = readFileSync(checklistPath, "utf8");
    const artifactContent = readFileSync(artifactPath, "utf8").replace(
      "## Evidence rule",
      "## Evidence removed",
    );

    const result = verifyMechanismStatusArtifact(
      checklistContent,
      artifactContent,
    );

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("missing contract section: ## Evidence rule"),
      ),
    ).toBe(true);
  });

  test("fails when operator controls are stripped from the artifact", () => {
    const checklistContent = readFileSync(checklistPath, "utf8");
    const artifactContent = readFileSync(artifactPath, "utf8").replace(
      /### Controls that require operator configuration[\s\S]*?### What repository workflows actually enforce/,
      "### What repository workflows actually enforce",
    );

    const result = verifyMechanismStatusArtifact(
      checklistContent,
      artifactContent,
    );

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) =>
        issue.message.includes(
          "Operator/manual requirements must document control: GitHub branch protection",
        ),
      ),
    ).toBe(true);
  });

  test("fails when reviewer command markers are stripped from the artifact", () => {
    const checklistContent = readFileSync(checklistPath, "utf8");
    const artifactContent = readFileSync(artifactPath, "utf8").replace(
      "### Repeatable reviewer path",
      "### Reviewer path removed",
    );

    const result = verifyMechanismStatusArtifact(
      checklistContent,
      artifactContent,
    );

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) =>
        issue.message.includes(
          "Reviewer commands must document verification path marker: ### Repeatable reviewer path",
        ),
      ),
    ).toBe(true);
  });

  test("fails when phase boundary markers are stripped from the artifact", () => {
    const checklistContent = readFileSync(checklistPath, "utf8");
    const artifactContent = readFileSync(artifactPath, "utf8").replace(
      "### Intentionally deferred mechanisms",
      "### Deferred mechanisms removed",
    );

    const result = verifyMechanismStatusArtifact(
      checklistContent,
      artifactContent,
    );

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) =>
        issue.message.includes(
          "Phase 1 boundaries must document deferred scope marker: ### Intentionally deferred mechanisms",
        ),
      ),
    ).toBe(true);
  });

  test("fails when an unexpected category entry is added to the artifact", () => {
    const checklist = `
## Testing

* item
`;
    const artifact = `
## Operator and manual requirements

GitHub branch protection
Environment secrets
Preview deployment infrastructure
Production hosting configuration
#### \`.github/workflows/ci.yml\`
#### \`.github/workflows/deploy.yml\`

## Status values
**implemented**
**partially implemented**
**missing**

## Evidence rule

## Required fields per category

## Phase 1 boundaries and deferred mechanisms

### Current localization posture
English only
Locale-prefixed routes
preview deployments
Storybook
Lighthouse
PDF Export Contract
Blog Components Contract

### Intentionally deferred mechanisms

## Category entries

### Testing

| Field | Value |
| --- | --- |
| **Status** | implemented |
| **Repository evidence** | \`src/tests/**\` |

### Phantom category

| Field | Value |
| --- | --- |
| **Status** | missing |
| **Repository evidence** | none |

## Reviewer commands
`;

    const result = verifyMechanismStatusArtifact(checklist, artifact);

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("unexpected category entry: Phantom category"),
      ),
    ).toBe(true);
  });
});
