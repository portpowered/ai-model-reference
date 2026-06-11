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
});
