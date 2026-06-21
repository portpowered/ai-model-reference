import { describe, expect, test } from "bun:test";
import {
  collectLegacyClassificationBudgetGuard,
  collectLegacyTaxonomyCompatibilityBudget,
  formatLegacyClassificationBudgetGuard,
  formatLegacyTaxonomyCompatibilityBudget,
  legacyTaxonomyCompatibilityBudgetContract,
} from "./legacy-taxonomy-compatibility-budget";
import type { TypedTaxonomyConsumerAuditResult } from "./typed-taxonomy-consumer-audit";

function createTypedTaxonomyAuditResult(
  overrides: Partial<TypedTaxonomyConsumerAuditResult> = {},
): TypedTaxonomyConsumerAuditResult {
  return {
    auditedAtUtc: "2026-06-21T00:00:00.000Z",
    clusterSummaries: [],
    contractStatus: "aligned",
    entries: [
      {
        id: "search-document-facet-compatibility",
        path: "src/lib/search/legacy-taxonomy-compat.ts",
        cluster: "search",
        status: "approved-compatibility-bridge",
        owner: "search/discovery",
        fields: ["moduleType", "conceptType", "variantGroup"],
        evidence: [],
        rationale: "Compatibility bridge.",
        contractDrift: [],
        fieldReferences: [
          {
            field: "moduleType",
            line: 1,
            text: "moduleType",
          },
          {
            field: "conceptType",
            line: 2,
            text: "conceptType",
          },
          {
            field: "variantGroup",
            line: 3,
            text: "variantGroup",
          },
        ],
      },
      {
        id: "search-document-ontology-first-facet-builder",
        path: "src/lib/search/build-documents.ts",
        cluster: "search",
        status: "migrated-ontology-first-consumer",
        owner: "search/discovery",
        fields: [],
        evidence: [],
        rationale: "Ontology-first builder.",
        contractDrift: [],
        fieldReferences: [],
      },
      {
        id: "search-document-public-facet-shape",
        path: "src/lib/search/types.ts",
        cluster: "search",
        status: "approved-compatibility-bridge",
        owner: "search/discovery",
        fields: ["moduleType"],
        evidence: [],
        rationale: "Public facet shape.",
        contractDrift: [],
        fieldReferences: Array.from({ length: 11 }, () => ({
          field: "moduleType" as const,
          line: 1,
          text: "moduleType",
        })),
      },
    ],
    fieldInventory: ["moduleType", "conceptType", "variantGroup"],
    nextMigrationTarget: null,
    totals: {
      entryCount: 3,
      fieldReferenceCount: 14,
      statusCounts: {
        "approved-compatibility-bridge": 2,
        "migrated-ontology-first-consumer": 1,
        "unresolved-migration-target": 0,
      },
    },
    ...overrides,
  };
}

describe("legacy taxonomy compatibility budget", () => {
  test("matches the committed repo baseline", () => {
    const snapshot = collectLegacyTaxonomyCompatibilityBudget({
      repoRoot: process.cwd(),
    });

    expect(snapshot.status).toBe("aligned");
    expect(snapshot.legacyClassificationSurface.currentBridgeCount).toBe(
      legacyTaxonomyCompatibilityBudgetContract.legacyClassificationSurface
        .approvedBridgeCount,
    );
    expect(snapshot.deprecatedTypedTaxonomySurface.currentEntryIds).toEqual(
      legacyTaxonomyCompatibilityBudgetContract.deprecatedTypedTaxonomySurface
        .approvedEntryIds,
    );
    expect(
      snapshot.deprecatedTypedTaxonomySurface.currentFieldReferenceCount,
    ).toBe(
      legacyTaxonomyCompatibilityBudgetContract.deprecatedTypedTaxonomySurface
        .approvedFieldReferenceCount,
    );

    const report = formatLegacyTaxonomyCompatibilityBudget(snapshot);
    expect(report).toContain("Legacy taxonomy compatibility budget");
    expect(report).toContain("registry runtime legacy classification bridges");
    expect(report).toContain("search typed-taxonomy compatibility cluster");
    expect(report).toContain(
      "All governed surfaces match the approved compatibility budget.",
    );
  });

  test("reports drift when either governed surface grows", () => {
    const snapshot = collectLegacyTaxonomyCompatibilityBudget({
      auditedAtUtc: "2026-06-21T00:00:00.000Z",
      legacyClassificationBridges: [
        ...legacyTaxonomyCompatibilityBudgetContract.legacyClassificationSurface
          .approvedBridges,
        {
          legacyId: "classification.extra-legacy-bridge",
          canonicalId: "classification.module.attention",
        },
      ],
      typedTaxonomyAudit: createTypedTaxonomyAuditResult({
        entries: [
          ...createTypedTaxonomyAuditResult().entries,
          {
            id: "search-extra-compatibility-consumer",
            path: "src/lib/search/extra.ts",
            cluster: "search",
            status: "approved-compatibility-bridge",
            owner: "search/discovery",
            fields: ["conceptType"],
            evidence: [],
            rationale: "Unexpected extra consumer.",
            contractDrift: [],
            fieldReferences: [
              {
                field: "conceptType",
                line: 1,
                text: "conceptType",
              },
            ],
          },
        ],
      }),
    });

    expect(snapshot.status).toBe("drifted");
    expect(snapshot.legacyClassificationSurface.drift).toEqual(
      expect.arrayContaining([
        "approved 8 bridges but found 9",
        expect.stringContaining(
          'registry runtime legacy classification bridges added "classification.extra-legacy-bridge -> classification.module.attention"',
        ),
      ]),
    );
    expect(snapshot.deprecatedTypedTaxonomySurface.drift).toEqual(
      expect.arrayContaining([
        "approved 3 search-cluster entries but found 4",
        "approved 14 search-cluster field references but found 15",
        expect.stringContaining(
          'search typed-taxonomy compatibility cluster entries added "search-extra-compatibility-consumer"',
        ),
      ]),
    );
  });

  test("fails the legacy bridge guard when the approved bridge inventory grows", () => {
    const result = collectLegacyClassificationBudgetGuard({
      auditedAtUtc: "2026-06-21T00:00:00.000Z",
      legacyClassificationBridges: [
        ...legacyTaxonomyCompatibilityBudgetContract.legacyClassificationSurface
          .approvedBridges,
        {
          legacyId: "classification.extra-legacy-bridge",
          canonicalId: "classification.module.attention",
        },
      ],
      typedTaxonomyAudit: createTypedTaxonomyAuditResult(),
    });

    expect(result.status).toBe("drifted");
    expect(result.drift).toEqual(
      expect.arrayContaining([
        "approved 8 bridges but found 9",
        expect.stringContaining(
          'registry runtime legacy classification bridges added "classification.extra-legacy-bridge -> classification.module.attention"',
        ),
      ]),
    );

    const report = formatLegacyClassificationBudgetGuard(result);
    expect(report).toContain(
      "Legacy classification compatibility budget guard",
    );
    expect(report).toContain("Status: drifted");
    expect(report).toContain("Approved baseline: 8 bridges");
    expect(report).toContain("Current measured: 9 bridges");
  });
});
