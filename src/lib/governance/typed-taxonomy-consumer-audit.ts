import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

export const LEGACY_TYPED_TAXONOMY_FIELDS = [
  "moduleType",
  "conceptType",
  "variantGroup",
  "regimeType",
  "systemType",
  "sidebarGrouping",
] as const;

export type LegacyTypedTaxonomyField =
  (typeof LEGACY_TYPED_TAXONOMY_FIELDS)[number];

export const TYPED_TAXONOMY_CONSUMER_STATUS_LABELS = {
  "approved-compatibility-bridge": "approved compatibility bridge",
  "migrated-ontology-first-consumer": "migrated ontology-first consumer",
  "unresolved-migration-target": "unresolved migration target",
} as const;

export type TypedTaxonomyConsumerStatus =
  keyof typeof TYPED_TAXONOMY_CONSUMER_STATUS_LABELS;

export const TYPED_TAXONOMY_CONSUMER_CLUSTER_LABELS = {
  "authoring-guidance": "authoring guidance",
  "authoring-page-spec": "page-spec authoring",
  "generation-page-bundle": "page-bundle generation",
  "metadata-ui": "metadata UI",
  "registry-validation": "registry validation",
  "related-doc-derivation": "related-doc derivation",
  search: "search",
  "sidebar-topology": "sidebar/topology",
} as const;

export type TypedTaxonomyConsumerCluster =
  keyof typeof TYPED_TAXONOMY_CONSUMER_CLUSTER_LABELS;

export type TypedTaxonomyConsumerContractEntry = {
  cluster: TypedTaxonomyConsumerCluster;
  evidence: readonly string[];
  fields: readonly LegacyTypedTaxonomyField[];
  id: string;
  owner: string;
  path: string;
  rationale: string;
  status: TypedTaxonomyConsumerStatus;
};

export type TypedTaxonomyConsumerFieldReference = {
  field: LegacyTypedTaxonomyField;
  line: number;
  text: string;
};

export type TypedTaxonomyConsumerAuditEntry =
  TypedTaxonomyConsumerContractEntry & {
    contractDrift: readonly string[];
    fieldReferences: readonly TypedTaxonomyConsumerFieldReference[];
  };

export type TypedTaxonomyConsumerAuditClusterSummary = {
  cluster: TypedTaxonomyConsumerCluster;
  clusterLabel: string;
  entryCount: number;
  fieldCount: number;
  statusCounts: Record<TypedTaxonomyConsumerStatus, number>;
};

export type TypedTaxonomyConsumerAuditResult = {
  auditedAtUtc: string;
  clusterSummaries: readonly TypedTaxonomyConsumerAuditClusterSummary[];
  contractStatus: "aligned" | "drifted";
  entries: readonly TypedTaxonomyConsumerAuditEntry[];
  fieldInventory: readonly LegacyTypedTaxonomyField[];
  totals: {
    entryCount: number;
    fieldReferenceCount: number;
    statusCounts: Record<TypedTaxonomyConsumerStatus, number>;
  };
};

export class TypedTaxonomyConsumerAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TypedTaxonomyConsumerAuditError";
  }
}

export const typedTaxonomyConsumerAuditContract: readonly TypedTaxonomyConsumerContractEntry[] =
  [
    {
      id: "search-document-facet-compatibility",
      path: "src/lib/search/build-documents.ts",
      cluster: "search",
      status: "unresolved-migration-target",
      owner: "search/discovery",
      fields: ["moduleType", "conceptType", "variantGroup"],
      evidence: [
        "facets.moduleType = registryRecord.moduleType;",
        "facets.legacyConceptType = registryRecord.conceptType;",
        "facets.legacyVariantGroup = registryRecord.variantGroup;",
      ],
      rationale:
        "Search still derives legacy module and concept facets directly from registry typed taxonomy fields instead of routing them through an explicit compatibility adapter.",
    },
    {
      id: "search-document-public-facet-shape",
      path: "src/lib/search/types.ts",
      cluster: "search",
      status: "approved-compatibility-bridge",
      owner: "search/discovery",
      fields: ["moduleType"],
      evidence: ["moduleType?: string;"],
      rationale:
        "The indexed search-document facet shape still exposes moduleType while downstream filters remain compatibility-bound.",
    },
    {
      id: "sidebar-group-derivation",
      path: "src/lib/content/sidebar-grouping.ts",
      cluster: "sidebar-topology",
      status: "unresolved-migration-target",
      owner: "navigation/docs-shell",
      fields: [
        "conceptType",
        "moduleType",
        "regimeType",
        "systemType",
        "sidebarGrouping",
      ],
      evidence: [
        'record.conceptType === "math"',
        'record.moduleType === "attention"',
        'record.regimeType === "alignment"',
        'record.systemType === "memory"',
        'record.sidebarGrouping?.modules ?? "attention-variants"',
      ],
      rationale:
        "Sidebar subgroup placement still depends primarily on legacy typed taxonomy and editorial sidebarGrouping overrides instead of ontology-first derivation.",
    },
    {
      id: "related-doc-legacy-peer-fallbacks",
      path: "src/lib/content/related-docs.ts",
      cluster: "related-doc-derivation",
      status: "unresolved-migration-target",
      owner: "docs/discovery",
      fields: ["conceptType", "variantGroup"],
      evidence: [
        "return record.conceptType;",
        "if (!source.variantGroup) {",
        "candidate.variantGroup === source.variantGroup",
      ],
      rationale:
        "Related-doc derivation still exposes legacy same-concept-type and same-variant-group peer fallback paths after ontology-first peer sources.",
    },
    {
      id: "page-spec-legacy-authoring-fields",
      path: "src/lib/content/page-spec.ts",
      cluster: "authoring-page-spec",
      status: "approved-compatibility-bridge",
      owner: "content-authoring",
      fields: [
        "conceptType",
        "moduleType",
        "variantGroup",
        "regimeType",
        "systemType",
      ],
      evidence: [
        "conceptType: conceptTypeSchema.optional(),",
        "moduleType: moduleTypeSchema.optional(),",
        "variantGroup: z.string().optional(),",
        "regimeType: trainingRegimeTypeSchema.optional(),",
        "systemType: systemTypeSchema.optional(),",
      ],
      rationale:
        "Page specs still accept deprecated typed taxonomy fields as temporary compatibility inputs while ontology-first authoring is staged in.",
    },
    {
      id: "page-bundle-legacy-record-emission",
      path: "src/lib/content/generate-page-bundle.ts",
      cluster: "generation-page-bundle",
      status: "approved-compatibility-bridge",
      owner: "content-generation",
      fields: [
        "conceptType",
        "moduleType",
        "variantGroup",
        "regimeType",
        "systemType",
      ],
      evidence: [
        "spec.conceptType ? { conceptType: spec.conceptType } : {}",
        "spec.moduleType ? { moduleType: spec.moduleType } : {}",
        "spec.variantGroup ? { variantGroup: spec.variantGroup } : {}",
        "spec.regimeType ? { regimeType: spec.regimeType } : {}",
        "spec.systemType ? { systemType: spec.systemType } : {}",
      ],
      rationale:
        "Generated registry records still carry selected legacy typed taxonomy fields to keep unmigrated content and downstream readers functioning.",
    },
    {
      id: "registry-sidebar-grouping-validation",
      path: "src/lib/content/registry.ts",
      cluster: "registry-validation",
      status: "approved-compatibility-bridge",
      owner: "content-runtime",
      fields: [
        "moduleType",
        "conceptType",
        "regimeType",
        "systemType",
        "sidebarGrouping",
      ],
      evidence: [
        "validateSidebarGroupingForRecord(",
        'expectation: { field: "moduleType", expectedValue: "attention" },',
        'expectation: { field: "conceptType", expectedValue: "architecture" },',
        'expectation: { field: "regimeType", expectedValue: "alignment" },',
        'expectation: { field: "systemType", expectedValue: "routing" },',
      ],
      rationale:
        "Registry validation still enforces compatibility expectations that keep legacy typed taxonomy aligned with the ontology bridge during migration.",
    },
    {
      id: "module-metadata-card-legacy-display",
      path: "src/features/models/components/ModuleMetadataCard.tsx",
      cluster: "metadata-ui",
      status: "approved-compatibility-bridge",
      owner: "reader-experience",
      fields: ["moduleType", "conceptType", "variantGroup"],
      evidence: [
        "if (record.moduleType) {",
        "if (record.conceptType) {",
        "if (record.variantGroup) {",
      ],
      rationale:
        "Module detail metadata still renders legacy taxonomy labels directly for reader continuity.",
    },
    {
      id: "training-regime-at-a-glance-legacy-display",
      path: "src/features/models/components/TrainingRegimeAtAGlance.tsx",
      cluster: "metadata-ui",
      status: "approved-compatibility-bridge",
      owner: "reader-experience",
      fields: ["regimeType"],
      evidence: ["{record.regimeType ? ("],
      rationale:
        "Training regime detail cards still show regimeType as compatibility metadata for published pages.",
    },
    {
      id: "system-at-a-glance-legacy-display",
      path: "src/features/models/components/SystemAtAGlance.tsx",
      cluster: "metadata-ui",
      status: "approved-compatibility-bridge",
      owner: "reader-experience",
      fields: ["systemType"],
      evidence: ["{record.systemType ? ("],
      rationale:
        "System detail cards still show systemType as compatibility metadata for published pages.",
    },
    {
      id: "contributor-guide-legacy-authoring-matrix",
      path: "docs/contributors/CONTRIBUTING.md",
      cluster: "authoring-guidance",
      status: "approved-compatibility-bridge",
      owner: "maintainer-guidance",
      fields: [
        "moduleType",
        "conceptType",
        "variantGroup",
        "regimeType",
        "systemType",
        "sidebarGrouping",
      ],
      evidence: [
        "| `moduleType` | module | Temporarily accepted with warnings |",
        "| `conceptType` | concept, glossary, training-regime, system | Temporarily accepted with warnings |",
        "| `variantGroup` | module, training-regime, system | Compatibility-only fallback |",
        "| `sidebarGrouping` | concept, module, training-regime, system | No longer generated |",
      ],
      rationale:
        "Maintainer guidance explicitly documents which legacy fields are still tolerated and why.",
    },
    {
      id: "module-template-legacy-authoring-guidance",
      path: "docs/templates/module.content.md",
      cluster: "authoring-guidance",
      status: "approved-compatibility-bridge",
      owner: "content-authoring",
      fields: ["moduleType", "conceptType", "variantGroup"],
      evidence: [
        "Treat `moduleType`, `moduleFamily`, `conceptType`, and `variantGroup` as",
      ],
      rationale:
        "Module authoring templates still explain the temporary compatibility role of legacy taxonomy fields.",
    },
    {
      id: "concept-template-legacy-authoring-guidance",
      path: "docs/templates/concept.content.md",
      cluster: "authoring-guidance",
      status: "approved-compatibility-bridge",
      owner: "content-authoring",
      fields: ["conceptType", "sidebarGrouping"],
      evidence: [
        "Treat `conceptType` and `sidebarGrouping` as deprecated compatibility fields",
      ],
      rationale:
        "Concept authoring guidance still documents legacy glossary compatibility inputs.",
    },
    {
      id: "training-template-legacy-authoring-guidance",
      path: "docs/templates/training-regime.content.md",
      cluster: "authoring-guidance",
      status: "approved-compatibility-bridge",
      owner: "content-authoring",
      fields: ["regimeType", "conceptType", "variantGroup", "sidebarGrouping"],
      evidence: [
        "Treat `regimeType`, `conceptType`, `variantGroup`, and `sidebarGrouping` as",
      ],
      rationale:
        "Training-regime authoring guidance still documents the staged compatibility path for deprecated taxonomy fields.",
    },
    {
      id: "system-template-legacy-authoring-guidance",
      path: "docs/templates/system.content.md",
      cluster: "authoring-guidance",
      status: "approved-compatibility-bridge",
      owner: "content-authoring",
      fields: ["systemType", "conceptType", "variantGroup", "sidebarGrouping"],
      evidence: [
        "Treat `systemType`, `conceptType`,",
        "`variantGroup`, and `sidebarGrouping` as deprecated compatibility fields",
      ],
      rationale:
        "System authoring guidance still documents the staged compatibility path for deprecated taxonomy fields.",
    },
  ] as const;

type CollectTypedTaxonomyConsumerAuditOptions = {
  auditedAtUtc?: string;
  contractEntries?: readonly TypedTaxonomyConsumerContractEntry[];
};

function toRepoRelativePath(repoRoot: string, path: string): string {
  const absolute = resolve(repoRoot, path);
  return relative(repoRoot, absolute).replace(/\\/g, "/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectFieldReferences(
  source: string,
  fields: readonly LegacyTypedTaxonomyField[],
): TypedTaxonomyConsumerFieldReference[] {
  if (fields.length === 0) {
    return [];
  }

  const fieldPattern = new RegExp(
    `\\b(${fields.map((field) => escapeRegExp(field)).join("|")})\\b`,
  );

  return source
    .split(/\r?\n/)
    .flatMap((line, index): TypedTaxonomyConsumerFieldReference[] => {
      const match = line.match(fieldPattern);
      if (!match) {
        return [];
      }

      return [
        {
          field: match[1] as LegacyTypedTaxonomyField,
          line: index + 1,
          text: line.trim(),
        },
      ];
    });
}

function buildStatusCounts(): Record<TypedTaxonomyConsumerStatus, number> {
  return {
    "approved-compatibility-bridge": 0,
    "migrated-ontology-first-consumer": 0,
    "unresolved-migration-target": 0,
  };
}

export function collectTypedTaxonomyConsumerAudit(
  repoRoot: string,
  options: CollectTypedTaxonomyConsumerAuditOptions = {},
): TypedTaxonomyConsumerAuditResult {
  const entries = (
    options.contractEntries ?? typedTaxonomyConsumerAuditContract
  ).map((entry) => {
    const normalizedPath = toRepoRelativePath(repoRoot, entry.path);
    const absolutePath = resolve(repoRoot, normalizedPath);
    if (!existsSync(absolutePath)) {
      throw new TypedTaxonomyConsumerAuditError(
        `Audit contract path does not exist: ${normalizedPath}`,
      );
    }

    const source = readFileSync(absolutePath, "utf8");
    const contractDrift = entry.evidence.filter(
      (expectedSnippet) => !source.includes(expectedSnippet),
    );

    return {
      ...entry,
      path: normalizedPath,
      contractDrift,
      fieldReferences: collectFieldReferences(source, entry.fields),
    };
  });

  const totalStatusCounts = buildStatusCounts();
  for (const entry of entries) {
    totalStatusCounts[entry.status] += 1;
  }

  const clusterSummaries = Object.entries(
    TYPED_TAXONOMY_CONSUMER_CLUSTER_LABELS,
  ).map(([cluster, clusterLabel]) => {
    const clusterEntries = entries.filter((entry) => entry.cluster === cluster);
    const statusCounts = buildStatusCounts();
    let fieldCount = 0;

    for (const entry of clusterEntries) {
      statusCounts[entry.status] += 1;
      fieldCount += entry.fieldReferences.length;
    }

    return {
      cluster: cluster as TypedTaxonomyConsumerCluster,
      clusterLabel,
      entryCount: clusterEntries.length,
      fieldCount,
      statusCounts,
    };
  });

  return {
    auditedAtUtc: options.auditedAtUtc ?? new Date().toISOString(),
    contractStatus: entries.some((entry) => entry.contractDrift.length > 0)
      ? "drifted"
      : "aligned",
    entries,
    clusterSummaries,
    fieldInventory: [...LEGACY_TYPED_TAXONOMY_FIELDS],
    totals: {
      entryCount: entries.length,
      fieldReferenceCount: entries.reduce(
        (sum, entry) => sum + entry.fieldReferences.length,
        0,
      ),
      statusCounts: totalStatusCounts,
    },
  };
}

export function formatTypedTaxonomyConsumerAudit(
  audit: TypedTaxonomyConsumerAuditResult,
): string {
  const lines: string[] = [
    "Typed taxonomy consumer audit",
    `Audited at (UTC): ${audit.auditedAtUtc}`,
    `Contract status: ${audit.contractStatus}`,
    `Tracked fields: ${audit.fieldInventory.join(", ")}`,
    `Tracked entries: ${audit.totals.entryCount}`,
    `Observed field references: ${audit.totals.fieldReferenceCount}`,
    "",
    "Cluster summary",
  ];

  for (const summary of audit.clusterSummaries.filter(
    (cluster) => cluster.entryCount > 0,
  )) {
    lines.push(
      `- ${summary.clusterLabel}: ${summary.entryCount} entries, ${summary.fieldCount} field references, ${summary.statusCounts["approved-compatibility-bridge"]} approved bridges, ${summary.statusCounts["migrated-ontology-first-consumer"]} migrated, ${summary.statusCounts["unresolved-migration-target"]} unresolved`,
    );
  }

  for (const [cluster, clusterLabel] of Object.entries(
    TYPED_TAXONOMY_CONSUMER_CLUSTER_LABELS,
  )) {
    const clusterEntries = audit.entries.filter(
      (entry) => entry.cluster === cluster,
    );
    if (clusterEntries.length === 0) {
      continue;
    }

    lines.push("", clusterLabel);

    for (const entry of clusterEntries) {
      lines.push(
        `- ${entry.id} (${TYPED_TAXONOMY_CONSUMER_STATUS_LABELS[entry.status]})`,
      );
      lines.push(`  path: ${entry.path}`);
      lines.push(`  owner: ${entry.owner}`);
      lines.push(`  fields: ${entry.fields.join(", ")}`);
      lines.push(`  rationale: ${entry.rationale}`);

      if (entry.fieldReferences.length > 0) {
        const fieldReferenceSummary = entry.fieldReferences
          .slice(0, 5)
          .map((reference) => `${reference.field}@${reference.line}`)
          .join(", ");
        lines.push(`  evidence: ${fieldReferenceSummary}`);
      } else {
        lines.push("  evidence: none");
      }

      if (entry.contractDrift.length > 0) {
        lines.push(
          `  contract drift: missing snippets -> ${entry.contractDrift.join(" | ")}`,
        );
      }
    }
  }

  return `${lines.join("\n")}\n`;
}
