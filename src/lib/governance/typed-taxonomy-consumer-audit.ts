import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

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

export type TypedTaxonomyNextMigrationTarget = {
  cluster: TypedTaxonomyConsumerCluster;
  clusterLabel: string;
  entryCount: number;
  fieldCount: number;
  paths: readonly string[];
  rationale: string;
  unresolvedFieldBreadth: readonly LegacyTypedTaxonomyField[];
};

export type TypedTaxonomyConsumerAuditResult = {
  auditedAtUtc: string;
  clusterSummaries: readonly TypedTaxonomyConsumerAuditClusterSummary[];
  contractStatus: "aligned" | "drifted";
  entries: readonly TypedTaxonomyConsumerAuditEntry[];
  fieldInventory: readonly LegacyTypedTaxonomyField[];
  nextMigrationTarget: TypedTaxonomyNextMigrationTarget | null;
  totals: {
    entryCount: number;
    fieldReferenceCount: number;
    statusCounts: Record<TypedTaxonomyConsumerStatus, number>;
  };
};

export type TypedTaxonomyConsumerFenceViolationReason =
  | "uncategorized-path"
  | "undeclared-field";

export type TypedTaxonomyConsumerFenceViolation = {
  cluster: TypedTaxonomyConsumerCluster;
  field: LegacyTypedTaxonomyField;
  line: number;
  path: string;
  reason: TypedTaxonomyConsumerFenceViolationReason;
  text: string;
};

export type TypedTaxonomyConsumerFenceResult = {
  audit: TypedTaxonomyConsumerAuditResult;
  auditedAtUtc: string;
  scannedFileCount: number;
  violationStatus: "clear" | "violations-found";
  violations: readonly TypedTaxonomyConsumerFenceViolation[];
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
      path: "src/lib/search/legacy-taxonomy-compat.ts",
      cluster: "search",
      status: "approved-compatibility-bridge",
      owner: "search/discovery",
      fields: ["moduleType", "conceptType", "variantGroup"],
      evidence: [
        "deriveModuleTypeFromTopology(topology) ?? registryRecord.moduleType",
        "legacyConceptType: registryRecord.conceptType,",
        "legacyVariantGroup: registryRecord.variantGroup,",
      ],
      rationale:
        "Search now routes legacy module, concept, and variant facets through an explicit compatibility adapter while downstream filters still depend on those fields.",
    },
    {
      id: "search-document-ontology-first-facet-builder",
      path: "src/lib/search/build-documents.ts",
      cluster: "search",
      status: "migrated-ontology-first-consumer",
      owner: "search/discovery",
      fields: [],
      evidence: [
        "resolveLegacySearchTaxonomyCompatibility(registryRecord, topology)",
      ],
      rationale:
        "Search facet building now derives module taxonomy from ontology topology first and delegates any remaining legacy facet emission to the named compatibility adapter.",
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
      id: "glossary-template-legacy-authoring-guidance",
      path: "docs/templates/glossary.content.md",
      cluster: "authoring-guidance",
      status: "approved-compatibility-bridge",
      owner: "content-authoring",
      fields: ["conceptType"],
      evidence: [
        "The backing concept registry record at `src/content/registry/concepts/<slug>.json` should include `conceptType`,",
      ],
      rationale:
        "Glossary authoring guidance still documents conceptType as temporary compatibility metadata for concept-backed glossary records.",
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

type CollectTypedTaxonomyConsumerFenceOptions =
  CollectTypedTaxonomyConsumerAuditOptions;

type TypedTaxonomyConsumerFenceTarget = {
  cluster: TypedTaxonomyConsumerCluster;
  path: string;
  type: "directory" | "file";
};

const TYPED_TAXONOMY_CONSUMER_FENCE_TARGETS: readonly TypedTaxonomyConsumerFenceTarget[] =
  [
    { cluster: "search", path: "src/lib/search", type: "directory" },
    {
      cluster: "sidebar-topology",
      path: "src/lib/content/sidebar-grouping.ts",
      type: "file",
    },
    {
      cluster: "related-doc-derivation",
      path: "src/lib/content/related-docs.ts",
      type: "file",
    },
    {
      cluster: "authoring-page-spec",
      path: "src/lib/content/page-spec.ts",
      type: "file",
    },
    {
      cluster: "generation-page-bundle",
      path: "src/lib/content/generate-page-bundle.ts",
      type: "file",
    },
    {
      cluster: "registry-validation",
      path: "src/lib/content/registry.ts",
      type: "file",
    },
    {
      cluster: "metadata-ui",
      path: "src/features/models/components",
      type: "directory",
    },
    {
      cluster: "authoring-guidance",
      path: "docs/templates",
      type: "directory",
    },
    {
      cluster: "authoring-guidance",
      path: "docs/contributors/CONTRIBUTING.md",
      type: "file",
    },
  ] as const;

function toRepoRelativePath(repoRoot: string, path: string): string {
  const absolute = resolve(repoRoot, path);
  return relative(repoRoot, absolute).replace(/\\/g, "/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shouldScanTypedTaxonomyFencePath(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/");
  const extension = extname(normalizedPath);

  if (![".ts", ".tsx", ".md"].includes(extension)) {
    return false;
  }

  if (
    normalizedPath.includes("/__generate-fixtures__/") ||
    normalizedPath.endsWith(".test.ts") ||
    normalizedPath.endsWith(".test.tsx")
  ) {
    return false;
  }

  return true;
}

function collectFilesRecursively(directory: string): string[] {
  const entries = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  }) as Dirent[];

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(directory, entry.parentPath, entry.name));
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

function pickNextMigrationTarget(
  entries: readonly TypedTaxonomyConsumerAuditEntry[],
): TypedTaxonomyNextMigrationTarget | null {
  const unresolvedEntries = entries.filter(
    (entry) => entry.status === "unresolved-migration-target",
  );
  if (unresolvedEntries.length === 0) {
    return null;
  }

  const clusterCandidates = Object.entries(
    TYPED_TAXONOMY_CONSUMER_CLUSTER_LABELS,
  )
    .map(([cluster, clusterLabel]) => {
      const clusterEntries = unresolvedEntries.filter(
        (entry) => entry.cluster === cluster,
      );
      if (clusterEntries.length === 0) {
        return null;
      }

      const fieldBreadth = [
        ...new Set(clusterEntries.flatMap((entry) => entry.fields)),
      ].sort();
      const fieldCount = clusterEntries.reduce(
        (sum, entry) => sum + entry.fieldReferences.length,
        0,
      );

      return {
        cluster: cluster as TypedTaxonomyConsumerCluster,
        clusterLabel,
        entryCount: clusterEntries.length,
        fieldCount,
        paths: clusterEntries.map((entry) => entry.path).sort(),
        rationale: clusterEntries.map((entry) => entry.rationale).join(" "),
        unresolvedFieldBreadth: fieldBreadth,
      } satisfies TypedTaxonomyNextMigrationTarget;
    })
    .filter((candidate) => candidate !== null);

  clusterCandidates.sort((left, right) => {
    if (right.fieldCount !== left.fieldCount) {
      return right.fieldCount - left.fieldCount;
    }

    if (
      right.unresolvedFieldBreadth.length !== left.unresolvedFieldBreadth.length
    ) {
      return (
        right.unresolvedFieldBreadth.length - left.unresolvedFieldBreadth.length
      );
    }

    if (right.entryCount !== left.entryCount) {
      return right.entryCount - left.entryCount;
    }

    return left.clusterLabel.localeCompare(right.clusterLabel);
  });

  return clusterCandidates[0];
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
    nextMigrationTarget: pickNextMigrationTarget(entries),
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

  lines.push("", "Recommended next migration target");

  if (!audit.nextMigrationTarget) {
    lines.push("- none: no unresolved migration targets remain in the audit");
  } else {
    const target = audit.nextMigrationTarget;
    lines.push(
      `- ${target.clusterLabel}: ${target.entryCount} unresolved entries, ${target.fieldCount} observed field references, ${target.unresolvedFieldBreadth.length} deprecated fields still primary`,
    );
    lines.push(`  paths: ${target.paths.join(", ")}`);
    lines.push(
      `  deprecated fields: ${target.unresolvedFieldBreadth.join(", ")}`,
    );
    lines.push(`  why next: ${target.rationale}`);
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

export function collectTypedTaxonomyConsumerFence(
  repoRoot: string,
  options: CollectTypedTaxonomyConsumerFenceOptions = {},
): TypedTaxonomyConsumerFenceResult {
  const audit = collectTypedTaxonomyConsumerAudit(repoRoot, options);
  const allowedFieldsByPath = new Map<string, Set<LegacyTypedTaxonomyField>>();

  for (const entry of audit.entries) {
    const allowedFields = allowedFieldsByPath.get(entry.path) ?? new Set();
    for (const field of entry.fields) {
      allowedFields.add(field);
    }
    allowedFieldsByPath.set(entry.path, allowedFields);
  }

  const scannedPaths = new Map<string, TypedTaxonomyConsumerCluster>();
  for (const target of TYPED_TAXONOMY_CONSUMER_FENCE_TARGETS) {
    const normalizedTargetPath = toRepoRelativePath(repoRoot, target.path);
    const absoluteTargetPath = resolve(repoRoot, normalizedTargetPath);
    if (!existsSync(absoluteTargetPath)) {
      continue;
    }

    if (target.type === "file") {
      if (shouldScanTypedTaxonomyFencePath(normalizedTargetPath)) {
        scannedPaths.set(normalizedTargetPath, target.cluster);
      }
      continue;
    }

    for (const absoluteFilePath of collectFilesRecursively(
      absoluteTargetPath,
    )) {
      const relativePath = toRepoRelativePath(repoRoot, absoluteFilePath);
      if (shouldScanTypedTaxonomyFencePath(relativePath)) {
        scannedPaths.set(relativePath, target.cluster);
      }
    }
  }

  const violations: TypedTaxonomyConsumerFenceViolation[] = [];

  for (const [path, cluster] of [...scannedPaths.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const source = readFileSync(resolve(repoRoot, path), "utf8");
    const fieldReferences = collectFieldReferences(
      source,
      LEGACY_TYPED_TAXONOMY_FIELDS,
    );
    if (fieldReferences.length === 0) {
      continue;
    }

    const allowedFields = allowedFieldsByPath.get(path);
    if (!allowedFields) {
      for (const reference of fieldReferences) {
        violations.push({
          cluster,
          field: reference.field,
          line: reference.line,
          path,
          reason: "uncategorized-path",
          text: reference.text,
        });
      }
      continue;
    }

    for (const reference of fieldReferences) {
      if (allowedFields.has(reference.field)) {
        continue;
      }

      violations.push({
        cluster,
        field: reference.field,
        line: reference.line,
        path,
        reason: "undeclared-field",
        text: reference.text,
      });
    }
  }

  return {
    audit,
    auditedAtUtc: options.auditedAtUtc ?? audit.auditedAtUtc,
    scannedFileCount: scannedPaths.size,
    violationStatus: violations.length === 0 ? "clear" : "violations-found",
    violations,
  };
}

export function formatTypedTaxonomyConsumerFence(
  result: TypedTaxonomyConsumerFenceResult,
): string {
  const lines = [
    "Typed taxonomy consumer deprecation fence",
    `Audited at (UTC): ${result.auditedAtUtc}`,
    `Contract status: ${result.audit.contractStatus}`,
    `Targeted files scanned: ${result.scannedFileCount}`,
    `Violation status: ${result.violationStatus}`,
  ];

  if (result.violations.length === 0) {
    lines.push(
      "No uncategorized or undeclared typed-taxonomy usage was found in the targeted runtime, generation, or authoring surfaces.",
    );
    return `${lines.join("\n")}\n`;
  }

  lines.push("", "Violations");

  for (const violation of result.violations) {
    const clusterLabel =
      TYPED_TAXONOMY_CONSUMER_CLUSTER_LABELS[violation.cluster];
    const reason =
      violation.reason === "uncategorized-path"
        ? "uncategorized targeted-surface usage"
        : "field is not declared in the audit contract for this path";
    lines.push(
      `- ${violation.path}:${violation.line} [${clusterLabel}] ${violation.field} -> ${reason}`,
    );
    lines.push(`  snippet: ${violation.text}`);
  }

  return `${lines.join("\n")}\n`;
}
