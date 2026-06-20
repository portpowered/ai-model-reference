import {
  registryDisplayTitle,
  registryRecordHref,
} from "@/lib/content/registry-linking";
import {
  getClassificationById,
  listClassificationMembers,
  listOntologyRelationshipsForRecord,
} from "@/lib/content/registry-runtime";
import type {
  ClassificationRecord,
  ConceptRecord,
  DatasetRecord,
  ModelRecord,
  ModuleRecord,
  OntologyRelationship,
  PaperRecord,
  SystemRecord,
  TrainingRegimeRecord,
} from "@/lib/content/schemas";

export const DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS = [
  "activation",
  "activation-function",
  "feed-forward",
] as const;

const selectorClassificationIds = new Map<string, string>([
  ["activation", "classification.activation-functions"],
  ["activation-function", "classification.activation-functions"],
  ["activation-functions", "classification.activation-functions"],
  [
    "classification.activation-functions",
    "classification.activation-functions",
  ],
  ["feed-forward", "classification.feed-forward-networks"],
  ["feed-forward-network", "classification.feed-forward-networks"],
  ["feed-forward-networks", "classification.feed-forward-networks"],
  [
    "classification.feed-forward-networks",
    "classification.feed-forward-networks",
  ],
  ["neural-network-components", "classification.neural-network-components"],
  [
    "classification.neural-network-components",
    "classification.neural-network-components",
  ],
]);

type TopologyRecord =
  | ModuleRecord
  | ConceptRecord
  | ModelRecord
  | PaperRecord
  | TrainingRegimeRecord
  | SystemRecord
  | DatasetRecord
  | ClassificationRecord;

export type TopologyClassificationSelection = {
  selector: string;
  classificationId: string;
  classification: ClassificationRecord;
};

export type TopologyNode =
  | {
      id: string;
      registryId: string;
      kind: "classification";
      label: string;
      slug: string;
      classificationType: ClassificationRecord["classificationType"];
      canonicalHref?: undefined;
    }
  | {
      id: string;
      registryId: string;
      kind: "record";
      label: string;
      slug: string;
      recordKind: TopologyRecord["kind"];
      primaryClassificationId?: string;
      secondaryClassificationIds: string[];
      canonicalHref?: string;
    };

export type TopologyEdge =
  | {
      id: string;
      kind: "membership";
      sourceId: string;
      targetId: string;
      label: "primary member" | "secondary member";
      membershipType: "primary" | "secondary";
      classificationId: string;
    }
  | {
      id: string;
      kind: "relationship";
      sourceId: string;
      targetId: string;
      label: OntologyRelationship["relationshipType"];
      relationshipType: OntologyRelationship["relationshipType"];
    };

export type TopologyGraph = {
  selectedClassifications: TopologyClassificationSelection[];
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};

export type TopologyGraphResult =
  | ({
      status: "success";
    } & TopologyGraph)
  | ({
      status: "empty";
      reason: "no-selection" | "no-members";
    } & TopologyGraph)
  | {
      status: "error";
      invalidSelections: string[];
      recoverySelection: readonly string[];
      nodes: [];
      edges: [];
      selectedClassifications: [];
    };

function normalizeSelector(selector: string): string {
  return selector.trim().toLowerCase();
}

function compareByRegistryId(
  left: { registryId: string },
  right: { registryId: string },
) {
  return left.registryId.localeCompare(right.registryId);
}

function isTopologyRecord(record: { kind: string }): record is TopologyRecord {
  return (
    record.kind === "module" ||
    record.kind === "concept" ||
    record.kind === "model" ||
    record.kind === "paper" ||
    record.kind === "training-regime" ||
    record.kind === "system" ||
    record.kind === "dataset" ||
    record.kind === "classification"
  );
}

function toClassificationNode(record: ClassificationRecord): TopologyNode {
  return {
    id: record.id,
    registryId: record.id,
    kind: "classification",
    label: registryDisplayTitle(record),
    slug: record.slug,
    classificationType: record.classificationType,
  };
}

function toRecordNode(record: TopologyRecord): TopologyNode {
  if (record.kind === "classification") {
    return toClassificationNode(record);
  }

  return {
    id: record.id,
    registryId: record.id,
    kind: "record",
    label: registryDisplayTitle(record),
    slug: record.slug,
    recordKind: record.kind,
    primaryClassificationId: record.primaryClassificationId,
    secondaryClassificationIds: record.secondaryClassificationIds ?? [],
    canonicalHref: registryRecordHref(record),
  };
}

function resolveSelections(selectors: readonly string[]): {
  selectedClassifications: TopologyClassificationSelection[];
  invalidSelections: string[];
} {
  const selections = new Map<string, TopologyClassificationSelection>();
  const invalidSelections: string[] = [];

  for (const selector of selectors) {
    const normalizedSelector = normalizeSelector(selector);
    if (!normalizedSelector) {
      continue;
    }

    const classificationId =
      selectorClassificationIds.get(normalizedSelector) ?? normalizedSelector;
    const classification = getClassificationById(classificationId);
    if (!classification) {
      invalidSelections.push(selector);
      continue;
    }

    if (!selections.has(classification.id)) {
      selections.set(classification.id, {
        selector: normalizedSelector,
        classificationId: classification.id,
        classification,
      });
    }
  }

  return {
    selectedClassifications: [...selections.values()],
    invalidSelections,
  };
}

export function buildTopologyGraph(
  selectors: readonly string[],
): TopologyGraphResult {
  if (selectors.length === 0) {
    return {
      status: "empty",
      reason: "no-selection",
      selectedClassifications: [],
      nodes: [],
      edges: [],
    };
  }

  const { selectedClassifications, invalidSelections } =
    resolveSelections(selectors);
  if (invalidSelections.length > 0) {
    return {
      status: "error",
      invalidSelections,
      recoverySelection: DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS,
      selectedClassifications: [],
      nodes: [],
      edges: [],
    };
  }

  if (selectedClassifications.length === 0) {
    return {
      status: "empty",
      reason: "no-selection",
      selectedClassifications: [],
      nodes: [],
      edges: [],
    };
  }

  const nodesById = new Map<string, TopologyNode>();
  const edgesById = new Map<string, TopologyEdge>();
  const memberRecordIds = new Set<string>();

  for (const selection of selectedClassifications) {
    nodesById.set(
      selection.classification.id,
      toClassificationNode(selection.classification),
    );

    for (const member of listClassificationMembers(
      selection.classificationId,
    )) {
      memberRecordIds.add(member.record.id);
      nodesById.set(member.record.id, toRecordNode(member.record));

      const edge: TopologyEdge = {
        id: `membership:${selection.classificationId}:${member.record.id}:${member.membershipType}`,
        kind: "membership",
        sourceId: selection.classificationId,
        targetId: member.record.id,
        label:
          member.membershipType === "primary"
            ? "primary member"
            : "secondary member",
        membershipType: member.membershipType,
        classificationId: selection.classificationId,
      };
      edgesById.set(edge.id, edge);
    }
  }

  if (memberRecordIds.size === 0) {
    return {
      status: "empty",
      reason: "no-members",
      selectedClassifications,
      nodes: [],
      edges: [],
    };
  }

  for (const sourceId of memberRecordIds) {
    for (const relationship of listOntologyRelationshipsForRecord(sourceId)) {
      const target = relationship.target;
      if (!target || !isTopologyRecord(target)) {
        continue;
      }

      nodesById.set(target.id, toRecordNode(target));
      const edge: TopologyEdge = {
        id: `relationship:${sourceId}:${relationship.relationshipType}:${target.id}`,
        kind: "relationship",
        sourceId,
        targetId: target.id,
        label: relationship.relationshipType,
        relationshipType: relationship.relationshipType,
      };
      edgesById.set(edge.id, edge);
    }
  }

  return {
    status: "success",
    selectedClassifications,
    nodes: [...nodesById.values()].sort(compareByRegistryId),
    edges: [...edgesById.values()].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  };
}
