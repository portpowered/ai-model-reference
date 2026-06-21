import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  collectTypedTaxonomyConsumerAudit,
  formatTypedTaxonomyConsumerAudit,
  type TypedTaxonomyConsumerContractEntry,
} from "./typed-taxonomy-consumer-audit";

describe("typed taxonomy consumer audit", () => {
  test("collects grouped consumer entries and field references", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "typed-taxonomy-audit-"));

    try {
      mkdirSync(join(repoRoot, "src/lib/search"), { recursive: true });
      mkdirSync(join(repoRoot, "src/lib/content"), { recursive: true });

      writeFileSync(
        join(repoRoot, "src/lib/search/build-documents.ts"),
        [
          "facets.moduleType = registryRecord.moduleType;",
          "facets.legacyConceptType = registryRecord.conceptType;",
          "",
        ].join("\n"),
      );
      writeFileSync(
        join(repoRoot, "src/lib/content/sidebar-grouping.ts"),
        [
          'if (record.moduleType === "attention") {',
          '  return record.sidebarGrouping?.modules ?? "attention-variants";',
          "}",
          "",
        ].join("\n"),
      );

      const contractEntries: readonly TypedTaxonomyConsumerContractEntry[] = [
        {
          id: "search",
          path: "src/lib/search/build-documents.ts",
          cluster: "search",
          status: "unresolved-migration-target",
          owner: "search/discovery",
          fields: ["moduleType", "conceptType"],
          evidence: [
            "facets.moduleType = registryRecord.moduleType;",
            "facets.legacyConceptType = registryRecord.conceptType;",
          ],
          rationale: "Search still reads legacy facets inline.",
        },
        {
          id: "sidebar",
          path: "src/lib/content/sidebar-grouping.ts",
          cluster: "sidebar-topology",
          status: "approved-compatibility-bridge",
          owner: "navigation/docs-shell",
          fields: ["moduleType", "sidebarGrouping"],
          evidence: [
            'record.moduleType === "attention"',
            'record.sidebarGrouping?.modules ?? "attention-variants"',
          ],
          rationale: "Sidebar grouping still uses compatibility inputs.",
        },
      ];

      const audit = collectTypedTaxonomyConsumerAudit(repoRoot, {
        auditedAtUtc: "2026-06-21T00:00:00.000Z",
        contractEntries,
      });

      expect(audit.contractStatus).toBe("aligned");
      expect(audit.totals.entryCount).toBe(2);
      expect(audit.totals.statusCounts["approved-compatibility-bridge"]).toBe(
        1,
      );
      expect(audit.totals.statusCounts["unresolved-migration-target"]).toBe(1);
      expect(audit.clusterSummaries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            cluster: "search",
            entryCount: 1,
          }),
          expect.objectContaining({
            cluster: "sidebar-topology",
            entryCount: 1,
          }),
        ]),
      );
      expect(audit.nextMigrationTarget).toEqual(
        expect.objectContaining({
          cluster: "search",
          entryCount: 1,
          fieldCount: 3,
          unresolvedFieldBreadth: ["conceptType", "moduleType"],
        }),
      );
      expect(audit.entries[0]?.fieldReferences).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "moduleType",
            line: 1,
          }),
          expect.objectContaining({
            field: "conceptType",
            line: 2,
          }),
        ]),
      );

      const report = formatTypedTaxonomyConsumerAudit(audit);
      expect(report).toContain("Typed taxonomy consumer audit");
      expect(report).toContain("Cluster summary");
      expect(report).toContain("Recommended next migration target");
      expect(report).toContain("search");
      expect(report).toContain("sidebar/topology");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("marks contract drift when expected evidence disappears", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "typed-taxonomy-audit-"));

    try {
      mkdirSync(join(repoRoot, "src/lib/content"), { recursive: true });
      writeFileSync(
        join(repoRoot, "src/lib/content/page-spec.ts"),
        "conceptType: conceptTypeSchema.optional(),\n",
      );

      const audit = collectTypedTaxonomyConsumerAudit(repoRoot, {
        contractEntries: [
          {
            id: "page-spec",
            path: "src/lib/content/page-spec.ts",
            cluster: "authoring-page-spec",
            status: "approved-compatibility-bridge",
            owner: "content-authoring",
            fields: ["conceptType", "moduleType"],
            evidence: [
              "conceptType: conceptTypeSchema.optional(),",
              "moduleType: moduleTypeSchema.optional(),",
            ],
            rationale: "Temporary page-spec compatibility bridge.",
          },
        ],
      });

      expect(audit.contractStatus).toBe("drifted");
      expect(audit.entries[0]?.contractDrift).toEqual([
        "moduleType: moduleTypeSchema.optional(),",
      ]);
      expect(audit.entries[0]?.fieldReferences).toEqual([
        {
          field: "conceptType",
          line: 1,
          text: "conceptType: conceptTypeSchema.optional(),",
        },
      ]);
      expect(audit.nextMigrationTarget).toBeNull();
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("scopes shared-file field references to the declared resolver slice", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "typed-taxonomy-audit-"));

    try {
      mkdirSync(join(repoRoot, "src/lib/content"), { recursive: true });
      writeFileSync(
        join(repoRoot, "src/lib/content/sidebar-grouping.ts"),
        [
          "type ModulesSidebarRecord = {",
          "  moduleType?: string;",
          "  sidebarGrouping?: SidebarGrouping;",
          "};",
          "",
          'if (membership.has("classification.module.attention")) {',
          '  return createSidebarGroupResolution("attention-variants", "derived-taxonomy");',
          "}",
          "const editorialGroup = record.sidebarGrouping?.modules;",
          "",
          "type ConceptsSidebarRecord = {",
          "  sidebarGrouping?: SidebarGrouping;",
          "};",
          'if (membership.has("classification.concept.inference")) {',
          '  return createSidebarGroupResolution("inference", "derived-taxonomy");',
          "}",
          "const conceptEditorialGroup = record.sidebarGrouping?.concepts;",
          "",
        ].join("\n"),
      );

      const contractEntries: readonly TypedTaxonomyConsumerContractEntry[] = [
        {
          id: "sidebar-modules",
          path: "src/lib/content/sidebar-grouping.ts",
          cluster: "sidebar-topology",
          status: "migrated-ontology-first-consumer",
          owner: "navigation/docs-shell",
          fields: ["moduleType", "sidebarGrouping"],
          evidence: [
            'membership.has("classification.module.attention")',
            "record.sidebarGrouping?.modules",
          ],
          fieldReferenceScopeSnippets: [
            'membership.has("classification.module.attention")',
            "record.sidebarGrouping?.modules",
          ],
          rationale:
            "Module sidebar grouping is scoped to module resolver lines.",
        },
        {
          id: "sidebar-concepts",
          path: "src/lib/content/sidebar-grouping.ts",
          cluster: "sidebar-topology",
          status: "migrated-ontology-first-consumer",
          owner: "navigation/docs-shell",
          fields: ["sidebarGrouping"],
          evidence: [
            'membership.has("classification.concept.inference")',
            "record.sidebarGrouping?.concepts",
          ],
          fieldReferenceScopeSnippets: [
            'membership.has("classification.concept.inference")',
            "record.sidebarGrouping?.concepts",
          ],
          rationale:
            "Concept sidebar grouping is scoped to concept resolver lines.",
        },
      ];

      const audit = collectTypedTaxonomyConsumerAudit(repoRoot, {
        contractEntries,
      });

      expect(audit.contractStatus).toBe("aligned");
      expect(audit.clusterSummaries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            cluster: "sidebar-topology",
            fieldCount: 2,
          }),
        ]),
      );
      expect(audit.entries[0]?.fieldReferences).toEqual([
        {
          field: "sidebarGrouping",
          line: 9,
          text: "const editorialGroup = record.sidebarGrouping?.modules;",
        },
      ]);
      expect(audit.entries[1]?.fieldReferences).toEqual([
        {
          field: "sidebarGrouping",
          line: 17,
          text: "const conceptEditorialGroup = record.sidebarGrouping?.concepts;",
        },
      ]);

      const report = formatTypedTaxonomyConsumerAudit(audit);
      expect(report).toContain("reference scope:");
      expect(report).toContain("sidebar-modules");
      expect(report).toContain("sidebar-concepts");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("tracks sidebar grouping as migrated ontology-first audit evidence in the current repo", () => {
    const repoRoot = resolve(import.meta.dir, "../../..");

    const audit = collectTypedTaxonomyConsumerAudit(repoRoot, {
      auditedAtUtc: "2026-06-22T00:00:00.000Z",
    });

    expect(audit.contractStatus).toBe("aligned");
    expect(audit.nextMigrationTarget).toBeNull();

    const sidebarEntries = audit.entries.filter(
      (entry) => entry.cluster === "sidebar-topology",
    );

    expect(sidebarEntries).toEqual([
      expect.objectContaining({
        id: "sidebar-group-derivation-module-training-system",
        status: "migrated-ontology-first-consumer",
        fields: ["sidebarGrouping"],
      }),
      expect.objectContaining({
        id: "sidebar-group-derivation-concept-glossary",
        status: "migrated-ontology-first-consumer",
        fields: ["sidebarGrouping"],
      }),
    ]);
    expect(
      sidebarEntries
        .flatMap((entry) => entry.fieldReferences)
        .map((ref) => ref.field),
    ).toEqual(Array(6).fill("sidebarGrouping"));
    expect(
      audit.clusterSummaries.find(
        (entry) => entry.cluster === "sidebar-topology",
      ),
    ).toEqual(
      expect.objectContaining({
        entryCount: 2,
        fieldCount: 6,
        statusCounts: {
          "approved-compatibility-bridge": 0,
          "migrated-ontology-first-consumer": 2,
          "unresolved-migration-target": 0,
        },
      }),
    );
  });
});
