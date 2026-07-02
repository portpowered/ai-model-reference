import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectTypedTaxonomyConsumerFence,
  formatTypedTaxonomyConsumerFence,
  type TypedTaxonomyConsumerContractEntry,
} from "./typed-taxonomy-consumer-audit";

describe("typed taxonomy consumer deprecation fence", () => {
  test("passes when targeted usage stays inside the declared audit contract", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "typed-taxonomy-fence-"));

    try {
      mkdirSync(join(repoRoot, "src/lib/search"), { recursive: true });
      writeFileSync(
        join(repoRoot, "src/lib/search/build-documents.ts"),
        "facets.moduleType = registryRecord.moduleType;\n",
      );

      const contractEntries: readonly TypedTaxonomyConsumerContractEntry[] = [
        {
          id: "search",
          path: "src/lib/search/build-documents.ts",
          cluster: "search",
          status: "approved-compatibility-bridge",
          owner: "search/discovery",
          fields: ["moduleType"],
          evidence: ["facets.moduleType = registryRecord.moduleType;"],
          rationale: "Temporary search compatibility bridge.",
        },
      ];

      const result = collectTypedTaxonomyConsumerFence(repoRoot, {
        auditedAtUtc: "2026-06-21T00:00:00.000Z",
        contractEntries,
      });

      expect(result.audit.contractStatus).toBe("aligned");
      expect(result.violationStatus).toBe("clear");
      expect(result.violations).toEqual([]);
      expect(formatTypedTaxonomyConsumerFence(result)).toContain(
        "No uncategorized or undeclared typed-taxonomy usage",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("fails when a targeted file introduces uncategorized typed-taxonomy usage", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "typed-taxonomy-fence-"));

    try {
      mkdirSync(join(repoRoot, "src/lib/search"), { recursive: true });
      writeFileSync(
        join(repoRoot, "src/lib/search/build-documents.ts"),
        "facets.moduleType = registryRecord.moduleType;\n",
      );
      writeFileSync(
        join(repoRoot, "src/lib/search/new-consumer.ts"),
        "return record.conceptType;\n",
      );

      const contractEntries: readonly TypedTaxonomyConsumerContractEntry[] = [
        {
          id: "search",
          path: "src/lib/search/build-documents.ts",
          cluster: "search",
          status: "approved-compatibility-bridge",
          owner: "search/discovery",
          fields: ["moduleType"],
          evidence: ["facets.moduleType = registryRecord.moduleType;"],
          rationale: "Temporary search compatibility bridge.",
        },
      ];

      const result = collectTypedTaxonomyConsumerFence(repoRoot, {
        contractEntries,
      });

      expect(result.violationStatus).toBe("violations-found");
      expect(result.violations).toEqual([
        expect.objectContaining({
          cluster: "search",
          field: "conceptType",
          line: 1,
          path: "src/lib/search/new-consumer.ts",
          reason: "uncategorized-path",
        }),
      ]);
      expect(formatTypedTaxonomyConsumerFence(result)).toContain(
        "src/lib/search/new-consumer.ts:1 [search] conceptType",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("fails when an approved path uses an undeclared legacy field", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "typed-taxonomy-fence-"));

    try {
      mkdirSync(join(repoRoot, "src/lib/search"), { recursive: true });
      writeFileSync(
        join(repoRoot, "src/lib/search/build-documents.ts"),
        [
          "facets.moduleType = registryRecord.moduleType;",
          "facets.legacyConceptType = registryRecord.conceptType;",
          "",
        ].join("\n"),
      );

      const contractEntries: readonly TypedTaxonomyConsumerContractEntry[] = [
        {
          id: "search",
          path: "src/lib/search/build-documents.ts",
          cluster: "search",
          status: "approved-compatibility-bridge",
          owner: "search/discovery",
          fields: ["moduleType"],
          evidence: ["facets.moduleType = registryRecord.moduleType;"],
          rationale: "Temporary search compatibility bridge.",
        },
      ];

      const result = collectTypedTaxonomyConsumerFence(repoRoot, {
        contractEntries,
      });

      expect(result.violationStatus).toBe("violations-found");
      expect(result.violations).toEqual([
        expect.objectContaining({
          cluster: "search",
          field: "conceptType",
          line: 2,
          path: "src/lib/search/build-documents.ts",
          reason: "undeclared-field",
        }),
      ]);
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("fails when an undeclared legacy field shares a line with an approved field", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "typed-taxonomy-fence-"));

    try {
      mkdirSync(join(repoRoot, "src/lib/search"), { recursive: true });
      writeFileSync(
        join(repoRoot, "src/lib/search/build-documents.ts"),
        "return [record.moduleType, record.conceptType].filter(Boolean);\n",
      );

      const contractEntries: readonly TypedTaxonomyConsumerContractEntry[] = [
        {
          id: "search",
          path: "src/lib/search/build-documents.ts",
          cluster: "search",
          status: "approved-compatibility-bridge",
          owner: "search/discovery",
          fields: ["moduleType"],
          evidence: [
            "return [record.moduleType, record.conceptType].filter(Boolean);",
          ],
          rationale: "Temporary search compatibility bridge.",
        },
      ];

      const result = collectTypedTaxonomyConsumerFence(repoRoot, {
        contractEntries,
      });

      expect(result.violationStatus).toBe("violations-found");
      expect(result.violations).toEqual([
        expect.objectContaining({
          cluster: "search",
          field: "conceptType",
          line: 1,
          path: "src/lib/search/build-documents.ts",
          reason: "undeclared-field",
          text: "return [record.moduleType, record.conceptType].filter(Boolean);",
        }),
      ]);
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("fails when sidebar grouping introduces an uncategorized typed-taxonomy read", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "typed-taxonomy-fence-"));

    try {
      mkdirSync(join(repoRoot, "src/lib/content"), { recursive: true });
      writeFileSync(
        join(repoRoot, "src/lib/content/sidebar-grouping.ts"),
        [
          "const editorialGroup = record.sidebarGrouping?.modules;",
          "return record.conceptType;",
          "",
        ].join("\n"),
      );

      const contractEntries: readonly TypedTaxonomyConsumerContractEntry[] = [
        {
          id: "sidebar",
          path: "src/lib/content/sidebar-grouping.ts",
          cluster: "sidebar-topology",
          status: "migrated-ontology-first-consumer",
          owner: "navigation/docs-shell",
          fields: ["sidebarGrouping"],
          evidence: ["record.sidebarGrouping?.modules"],
          rationale: "Sidebar grouping keeps one explicit editorial fallback.",
        },
      ];

      const result = collectTypedTaxonomyConsumerFence(repoRoot, {
        contractEntries,
      });

      expect(result.violationStatus).toBe("violations-found");
      expect(result.violations).toEqual([
        expect.objectContaining({
          cluster: "sidebar-topology",
          field: "conceptType",
          line: 2,
          path: "src/lib/content/sidebar-grouping.ts",
          reason: "undeclared-field",
        }),
      ]);
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });
});
