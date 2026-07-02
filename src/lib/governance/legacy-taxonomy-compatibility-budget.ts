import {
  type LegacyClassificationBridge,
  listLegacyClassificationBridges,
} from "@/lib/content/registry-runtime";
import {
  collectTypedTaxonomyConsumerAudit,
  type LegacyTypedTaxonomyField,
  type TypedTaxonomyConsumerAuditResult,
} from "./typed-taxonomy-consumer-audit";

export type LegacyTaxonomyCompatibilityBudgetStatus = "aligned" | "drifted";

export type LegacyClassificationBudgetSurfaceContract = {
  approvedBridgeCount: number;
  approvedBridges: readonly LegacyClassificationBridge[];
  owner: string;
  rationale: string;
  surfaceId: string;
  surfaceLabel: string;
};

export type TypedTaxonomyBudgetSurfaceContract = {
  approvedCluster: string;
  approvedEntryCount: number;
  approvedEntryIds: readonly string[];
  approvedEntries: readonly TypedTaxonomyBudgetEntryContract[];
  approvedFieldInventory: readonly LegacyTypedTaxonomyField[];
  approvedFieldReferenceCount: number;
  owner: string;
  rationale: string;
  surfaceId: string;
  surfaceLabel: string;
};

export type TypedTaxonomyBudgetEntryContract = {
  approvedFieldInventory: readonly LegacyTypedTaxonomyField[];
  approvedFieldReferenceCount: number;
  id: string;
  path: string;
};

export const legacyTaxonomyCompatibilityBudgetContract = {
  deprecatedTypedTaxonomySurface: {
    surfaceId: "search-typed-taxonomy-consumer-cluster",
    surfaceLabel: "search typed-taxonomy compatibility cluster",
    owner: "search/discovery",
    approvedCluster: "search",
    approvedEntryCount: 3,
    approvedEntryIds: [
      "search-document-facet-compatibility",
      "search-document-ontology-first-facet-builder",
      "search-document-public-facet-shape",
    ],
    approvedEntries: [
      {
        id: "search-document-facet-compatibility",
        path: "src/lib/search/legacy-taxonomy-compat.ts",
        approvedFieldInventory: [
          "conceptType",
          "moduleType",
          "variantGroup",
        ] as const,
        approvedFieldReferenceCount: 13,
      },
      {
        id: "search-document-ontology-first-facet-builder",
        path: "src/lib/search/build-documents.ts",
        approvedFieldInventory: [] as const,
        approvedFieldReferenceCount: 0,
      },
      {
        id: "search-document-public-facet-shape",
        path: "src/lib/search/types.ts",
        approvedFieldInventory: ["moduleType"] as const,
        approvedFieldReferenceCount: 1,
      },
    ] as const,
    approvedFieldInventory: [
      "conceptType",
      "moduleType",
      "variantGroup",
    ] as const,
    approvedFieldReferenceCount: 14,
    rationale:
      "Search still owns the temporary typed-taxonomy compatibility cluster that emits or bridges legacy module, concept, and variant facets while downstream filters migrate to ontology-first taxonomy.",
  } satisfies TypedTaxonomyBudgetSurfaceContract,
  legacyClassificationSurface: {
    surfaceId: "registry-runtime-legacy-classification-bridges",
    surfaceLabel: "registry runtime legacy classification bridges",
    owner: "content-runtime",
    approvedBridgeCount: 8,
    approvedBridges: [
      {
        legacyId: "classification.activation-functions",
        canonicalId: "classification.module.activation",
      },
      {
        legacyId: "classification.attention-mechanisms",
        canonicalId: "classification.module.attention",
      },
      {
        legacyId: "classification.feed-forward-networks",
        canonicalId: "classification.module.feed-forward",
      },
      {
        legacyId: "classification.neural-network-components",
        canonicalId: "classification.module",
      },
      {
        legacyId: "classification.normalization-layers",
        canonicalId: "classification.module.normalization",
      },
      {
        legacyId: "classification.position-encoding-methods",
        canonicalId: "classification.module.positional-encoding",
      },
      {
        legacyId: "classification.tokenization-methods",
        canonicalId: "classification.module.tokenization",
      },
      {
        legacyId: "classification.transformer-block-structures",
        canonicalId: "classification.module.transformer-block",
      },
    ] as const,
    rationale:
      "The generated registry runtime keeps one explicit legacy classification-id bridge inventory so canonical ontology records can still resolve the approved pre-ontology aliases without silently adding more aliases.",
  } satisfies LegacyClassificationBudgetSurfaceContract,
} as const;

export type LegacyClassificationBudgetMeasurement = {
  approvedBridgeCount: number;
  approvedBridges: readonly LegacyClassificationBridge[];
  currentBridgeCount: number;
  currentBridges: readonly LegacyClassificationBridge[];
  drift: readonly string[];
  owner: string;
  rationale: string;
  status: LegacyTaxonomyCompatibilityBudgetStatus;
  surfaceId: string;
  surfaceLabel: string;
};

export type TypedTaxonomyBudgetMeasurement = {
  approvedCluster: string;
  approvedEntryCount: number;
  approvedEntries: readonly TypedTaxonomyBudgetEntryMeasurement[];
  approvedEntryIds: readonly string[];
  approvedFieldInventory: readonly LegacyTypedTaxonomyField[];
  approvedFieldReferenceCount: number;
  currentEntries: readonly TypedTaxonomyBudgetEntryMeasurement[];
  currentEntryCount: number;
  currentEntryIds: readonly string[];
  currentFieldInventory: readonly LegacyTypedTaxonomyField[];
  currentFieldReferenceCount: number;
  drift: readonly string[];
  owner: string;
  rationale: string;
  status: LegacyTaxonomyCompatibilityBudgetStatus;
  surfaceId: string;
  surfaceLabel: string;
};

export type TypedTaxonomyBudgetEntryMeasurement = {
  fieldInventory: readonly LegacyTypedTaxonomyField[];
  fieldReferenceCount: number;
  id: string;
  path: string;
};

export type LegacyTaxonomyCompatibilityBudgetSnapshot = {
  auditedAtUtc: string;
  deprecatedTypedTaxonomySurface: TypedTaxonomyBudgetMeasurement;
  legacyClassificationSurface: LegacyClassificationBudgetMeasurement;
  status: LegacyTaxonomyCompatibilityBudgetStatus;
};

export type LegacyClassificationBudgetGuardResult = {
  auditedAtUtc: string;
  drift: readonly string[];
  approvedBridgeCount: number;
  currentBridgeCount: number;
  owner: string;
  rationale: string;
  status: LegacyTaxonomyCompatibilityBudgetStatus;
  surfaceId: string;
  surfaceLabel: string;
};

export type TypedTaxonomyBudgetGuardResult = {
  approvedCluster: string;
  approvedEntries: readonly TypedTaxonomyBudgetEntryMeasurement[];
  approvedEntryCount: number;
  approvedFieldInventory: readonly LegacyTypedTaxonomyField[];
  approvedFieldReferenceCount: number;
  auditedAtUtc: string;
  currentEntries: readonly TypedTaxonomyBudgetEntryMeasurement[];
  currentEntryCount: number;
  currentFieldInventory: readonly LegacyTypedTaxonomyField[];
  currentFieldReferenceCount: number;
  drift: readonly string[];
  owner: string;
  rationale: string;
  status: LegacyTaxonomyCompatibilityBudgetStatus;
  surfaceId: string;
  surfaceLabel: string;
};

type CollectLegacyTaxonomyCompatibilityBudgetOptions = {
  auditedAtUtc?: string;
  legacyClassificationBridges?: readonly LegacyClassificationBridge[];
  repoRoot?: string;
  typedTaxonomyAudit?: TypedTaxonomyConsumerAuditResult;
};

function sortBridgeInventory(
  bridges: readonly LegacyClassificationBridge[],
): LegacyClassificationBridge[] {
  return [...bridges].sort(
    (left, right) =>
      left.legacyId.localeCompare(right.legacyId) ||
      left.canonicalId.localeCompare(right.canonicalId),
  );
}

function toBridgeKey(bridge: LegacyClassificationBridge): string {
  return `${bridge.legacyId} -> ${bridge.canonicalId}`;
}

function collectAddedValues(
  approvedValues: readonly string[],
  currentValues: readonly string[],
  surfaceLabel: string,
): string[] {
  const approved = new Set(approvedValues);

  const added = currentValues
    .filter((value) => !approved.has(value))
    .map((value) => `${surfaceLabel} added "${value}"`);

  return added;
}

function toTypedTaxonomyBudgetEntryMeasurement(
  entry:
    | TypedTaxonomyBudgetEntryContract
    | Pick<
        TypedTaxonomyConsumerAuditResult["entries"][number],
        "fieldReferences" | "id" | "path"
      >,
): TypedTaxonomyBudgetEntryMeasurement {
  const fieldInventory =
    "approvedFieldInventory" in entry
      ? [...entry.approvedFieldInventory].sort()
      : [
          ...new Set(entry.fieldReferences.map((reference) => reference.field)),
        ].sort();
  const fieldReferenceCount =
    "approvedFieldReferenceCount" in entry
      ? entry.approvedFieldReferenceCount
      : entry.fieldReferences.length;

  return {
    fieldInventory,
    fieldReferenceCount,
    id: entry.id,
    path: entry.path,
  };
}

function sortTypedTaxonomyBudgetEntries(
  entries: readonly TypedTaxonomyBudgetEntryMeasurement[],
): TypedTaxonomyBudgetEntryMeasurement[] {
  return [...entries].sort(
    (left, right) =>
      left.id.localeCompare(right.id) || left.path.localeCompare(right.path),
  );
}

function collectLegacyClassificationSurfaceMeasurement(
  bridges: readonly LegacyClassificationBridge[],
): LegacyClassificationBudgetMeasurement {
  const contract =
    legacyTaxonomyCompatibilityBudgetContract.legacyClassificationSurface;
  const approvedBridges = sortBridgeInventory(contract.approvedBridges);
  const currentBridges = sortBridgeInventory(bridges);
  const drift = [
    ...(currentBridges.length <= contract.approvedBridgeCount
      ? []
      : [
          `approved ${contract.approvedBridgeCount} bridges but found ${currentBridges.length}`,
        ]),
    ...collectAddedValues(
      approvedBridges.map(toBridgeKey),
      currentBridges.map(toBridgeKey),
      contract.surfaceLabel,
    ),
  ];

  return {
    ...contract,
    approvedBridges,
    currentBridgeCount: currentBridges.length,
    currentBridges,
    drift,
    status: drift.length === 0 ? "aligned" : "drifted",
  };
}

function collectTypedTaxonomySurfaceMeasurement(
  audit: TypedTaxonomyConsumerAuditResult,
): TypedTaxonomyBudgetMeasurement {
  const contract =
    legacyTaxonomyCompatibilityBudgetContract.deprecatedTypedTaxonomySurface;
  const matchingEntries = audit.entries
    .filter((entry) => entry.cluster === contract.approvedCluster)
    .sort((left, right) => left.id.localeCompare(right.id));
  const currentEntryIds = matchingEntries.map((entry) => entry.id);
  const currentFieldInventory = [
    ...new Set(
      matchingEntries.flatMap((entry) =>
        entry.fieldReferences.map((reference) => reference.field),
      ),
    ),
  ].sort();
  const currentFieldReferenceCount = matchingEntries.reduce(
    (count, entry) => count + entry.fieldReferences.length,
    0,
  );
  const approvedEntries = sortTypedTaxonomyBudgetEntries(
    contract.approvedEntries.map(toTypedTaxonomyBudgetEntryMeasurement),
  );
  const currentEntries = sortTypedTaxonomyBudgetEntries(
    matchingEntries.map(toTypedTaxonomyBudgetEntryMeasurement),
  );
  const approvedEntryById = new Map(
    approvedEntries.map((entry) => [entry.id, entry]),
  );
  const drift = [
    ...(matchingEntries.length <= contract.approvedEntryCount
      ? []
      : [
          `approved ${contract.approvedEntryCount} search-cluster entries but found ${matchingEntries.length}`,
        ]),
    ...(currentFieldReferenceCount <= contract.approvedFieldReferenceCount
      ? []
      : [
          `approved ${contract.approvedFieldReferenceCount} search-cluster field references but found ${currentFieldReferenceCount}`,
        ]),
    ...collectAddedValues(
      contract.approvedEntryIds,
      currentEntryIds,
      `${contract.surfaceLabel} entries`,
    ),
    ...collectAddedValues(
      contract.approvedFieldInventory,
      currentFieldInventory,
      `${contract.surfaceLabel} fields`,
    ),
    ...currentEntries.flatMap((entry) => {
      const approvedEntry = approvedEntryById.get(entry.id);
      if (!approvedEntry) {
        return [
          `${contract.surfaceLabel} entry "${entry.id}" at ${entry.path} is outside the approved budget`,
        ];
      }

      return [
        ...(approvedEntry.path === entry.path
          ? []
          : [
              `${contract.surfaceLabel} entry "${entry.id}" moved from ${approvedEntry.path} to ${entry.path}`,
            ]),
        ...(entry.fieldReferenceCount <= approvedEntry.fieldReferenceCount
          ? []
          : [
              `${contract.surfaceLabel} entry "${entry.id}" at ${entry.path} approved ${approvedEntry.fieldReferenceCount} field references but found ${entry.fieldReferenceCount}`,
            ]),
        ...collectAddedValues(
          approvedEntry.fieldInventory,
          entry.fieldInventory,
          `${contract.surfaceLabel} entry "${entry.id}" fields`,
        ),
      ];
    }),
  ];

  return {
    ...contract,
    approvedEntries,
    currentEntries,
    currentEntryCount: matchingEntries.length,
    currentEntryIds,
    currentFieldInventory,
    currentFieldReferenceCount,
    drift,
    status: drift.length === 0 ? "aligned" : "drifted",
  };
}

export function collectLegacyTaxonomyCompatibilityBudget(
  options: CollectLegacyTaxonomyCompatibilityBudgetOptions = {},
): LegacyTaxonomyCompatibilityBudgetSnapshot {
  const auditedAtUtc = options.auditedAtUtc ?? new Date().toISOString();
  const repoRoot = options.repoRoot ?? process.cwd();
  const legacyClassificationBridges =
    options.legacyClassificationBridges ?? listLegacyClassificationBridges();
  const typedTaxonomyAudit =
    options.typedTaxonomyAudit ?? collectTypedTaxonomyConsumerAudit(repoRoot);

  const legacyClassificationSurface =
    collectLegacyClassificationSurfaceMeasurement(legacyClassificationBridges);
  const deprecatedTypedTaxonomySurface =
    collectTypedTaxonomySurfaceMeasurement(typedTaxonomyAudit);
  const status =
    legacyClassificationSurface.status === "aligned" &&
    deprecatedTypedTaxonomySurface.status === "aligned"
      ? "aligned"
      : "drifted";

  return {
    auditedAtUtc,
    deprecatedTypedTaxonomySurface,
    legacyClassificationSurface,
    status,
  };
}

export function collectLegacyClassificationBudgetGuard(
  options: CollectLegacyTaxonomyCompatibilityBudgetOptions = {},
): LegacyClassificationBudgetGuardResult {
  const snapshot = collectLegacyTaxonomyCompatibilityBudget(options);
  const surface = snapshot.legacyClassificationSurface;

  return {
    auditedAtUtc: snapshot.auditedAtUtc,
    drift: surface.drift,
    approvedBridgeCount: surface.approvedBridgeCount,
    currentBridgeCount: surface.currentBridgeCount,
    owner: surface.owner,
    rationale: surface.rationale,
    status: surface.status,
    surfaceId: surface.surfaceId,
    surfaceLabel: surface.surfaceLabel,
  };
}

export function collectTypedTaxonomyBudgetGuard(
  options: CollectLegacyTaxonomyCompatibilityBudgetOptions = {},
): TypedTaxonomyBudgetGuardResult {
  const snapshot = collectLegacyTaxonomyCompatibilityBudget(options);
  const surface = snapshot.deprecatedTypedTaxonomySurface;

  return {
    approvedCluster: surface.approvedCluster,
    approvedEntries: surface.approvedEntries,
    approvedEntryCount: surface.approvedEntryCount,
    approvedFieldInventory: surface.approvedFieldInventory,
    approvedFieldReferenceCount: surface.approvedFieldReferenceCount,
    auditedAtUtc: snapshot.auditedAtUtc,
    currentEntries: surface.currentEntries,
    currentEntryCount: surface.currentEntryCount,
    currentFieldInventory: surface.currentFieldInventory,
    currentFieldReferenceCount: surface.currentFieldReferenceCount,
    drift: surface.drift,
    owner: surface.owner,
    rationale: surface.rationale,
    status: surface.status,
    surfaceId: surface.surfaceId,
    surfaceLabel: surface.surfaceLabel,
  };
}

export function formatLegacyTaxonomyCompatibilityBudget(
  snapshot: LegacyTaxonomyCompatibilityBudgetSnapshot,
): string {
  const legacySurface = snapshot.legacyClassificationSurface;
  const typedSurface = snapshot.deprecatedTypedTaxonomySurface;
  const driftLines =
    snapshot.status === "aligned"
      ? ["All governed surfaces match the approved compatibility budget."]
      : [
          ...legacySurface.drift.map((drift) => `- ${drift}`),
          ...typedSurface.drift.map((drift) => `- ${drift}`),
        ];

  return [
    "Legacy taxonomy compatibility budget",
    `Audited at (UTC): ${snapshot.auditedAtUtc}`,
    `Status: ${snapshot.status}`,
    "",
    `Legacy classification surface: ${legacySurface.surfaceLabel}`,
    `Owner: ${legacySurface.owner}`,
    `Approved baseline: ${legacySurface.approvedBridgeCount} bridges`,
    `Current measured: ${legacySurface.currentBridgeCount} bridges`,
    `Approved inventory: ${legacySurface.approvedBridges.map(toBridgeKey).join(", ")}`,
    `Rationale: ${legacySurface.rationale}`,
    "",
    `Deprecated typed-taxonomy surface: ${typedSurface.surfaceLabel}`,
    `Owner: ${typedSurface.owner}`,
    `Approved cluster: ${typedSurface.approvedCluster}`,
    `Approved baseline: ${typedSurface.approvedEntryCount} entries, ${typedSurface.approvedFieldReferenceCount} field references`,
    `Current measured: ${typedSurface.currentEntryCount} entries, ${typedSurface.currentFieldReferenceCount} field references`,
    `Approved entry ids: ${typedSurface.approvedEntryIds.join(", ")}`,
    `Approved field inventory: ${typedSurface.approvedFieldInventory.join(", ")}`,
    `Rationale: ${typedSurface.rationale}`,
    "",
    "Drift details:",
    ...driftLines,
  ].join("\n");
}

export function formatLegacyClassificationBudgetGuard(
  result: LegacyClassificationBudgetGuardResult,
): string {
  return [
    "Legacy classification compatibility budget guard",
    `Audited at (UTC): ${result.auditedAtUtc}`,
    `Status: ${result.status}`,
    `Surface: ${result.surfaceLabel}`,
    `Owner: ${result.owner}`,
    `Approved baseline: ${result.approvedBridgeCount} bridges`,
    `Current measured: ${result.currentBridgeCount} bridges`,
    `Rationale: ${result.rationale}`,
    "",
    "Drift details:",
    ...(result.status === "aligned"
      ? ["No legacy classification bridge growth detected."]
      : result.drift.map((drift) => `- ${drift}`)),
  ].join("\n");
}

export function formatTypedTaxonomyBudgetGuard(
  result: TypedTaxonomyBudgetGuardResult,
): string {
  return [
    "Deprecated typed-taxonomy compatibility budget guard",
    `Audited at (UTC): ${result.auditedAtUtc}`,
    `Status: ${result.status}`,
    `Surface: ${result.surfaceLabel}`,
    `Owner: ${result.owner}`,
    `Approved cluster: ${result.approvedCluster}`,
    `Approved baseline: ${result.approvedEntryCount} entries, ${result.approvedFieldReferenceCount} field references`,
    `Current measured: ${result.currentEntryCount} entries, ${result.currentFieldReferenceCount} field references`,
    `Approved field inventory: ${result.approvedFieldInventory.join(", ")}`,
    `Current field inventory: ${result.currentFieldInventory.join(", ")}`,
    `Approved entry budgets: ${result.approvedEntries.map((entry) => `${entry.id} @ ${entry.path} (${entry.fieldReferenceCount} refs; fields: ${entry.fieldInventory.join(", ") || "none"})`).join("; ")}`,
    `Current entry inventory: ${result.currentEntries.map((entry) => `${entry.id} @ ${entry.path} (${entry.fieldReferenceCount} refs; fields: ${entry.fieldInventory.join(", ") || "none"})`).join("; ")}`,
    `Rationale: ${result.rationale}`,
    "",
    "Drift details:",
    ...(result.status === "aligned"
      ? ["No deprecated typed-taxonomy budget growth detected."]
      : result.drift.map((drift) => `- ${drift}`)),
  ].join("\n");
}
