import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getContentRoot, getRegistryRoot } from "./content-paths";
import {
  type PageSpec,
  type PageSpecKind,
  registryIdForPageSpec,
} from "./page-spec";
import {
  type GraphRecord,
  graphRecordSchema,
  type ModuleGraphEdge,
  type ModuleGraphNode,
  type PageAssetConfig,
} from "./schemas";

const TEMPLATE_ROOT_SEGMENTS = ["docs", "templates"] as const;

export type GraphRegistryArtifact = {
  graphId: string;
  path: string;
  record: GraphRecord;
  json: string;
};

function buildGraphStructureFromSpecNodes(
  nodeEntries: Record<string, { label: string; summary?: string }>,
): {
  nodes: ModuleGraphNode[];
  edges: ModuleGraphEdge[];
  rootNodeId: string;
} {
  const nodeIds = Object.keys(nodeEntries);
  if (nodeIds.length === 0) {
    throw new Error("Page spec graph.nodes must include at least one node");
  }

  const rootNodeId = nodeIds[0];
  if (!rootNodeId) {
    throw new Error("Page spec graph.nodes must include at least one node");
  }
  const nodes = nodeIds.map((id, index) => {
    const nextNodeId = nodeIds[index + 1];
    return {
      id,
      labelKey: `graph.nodes.${id}.label`,
      moduleKind: index === 0 ? ("input" as const) : ("other" as const),
      childNodeIds: nextNodeId ? [nextNodeId] : ([] as string[]),
    };
  });
  const edges = nodeIds.slice(0, -1).map((id, index) => {
    const target = nodeIds[index + 1];
    if (!target) {
      throw new Error("Graph edge target is missing");
    }
    return {
      id: `${id}-to-${target}`,
      source: id,
      target,
      edgeKind: "data-flow" as const,
    };
  });

  return { nodes, edges, rootNodeId };
}

async function readGraphTemplateFile(
  projectRoot: string,
  kind: PageSpecKind,
): Promise<string> {
  const templatePath = join(
    projectRoot,
    ...TEMPLATE_ROOT_SEGMENTS,
    `${kind}.graph.json`,
  );
  return readFile(templatePath, "utf8");
}

export async function buildGraphRegistryArtifacts(input: {
  spec: PageSpec;
  assets: PageAssetConfig;
  timestamp: string;
  projectRoot: string;
  applyTemplateSubstitutions: (content: string, spec: PageSpec) => string;
}): Promise<GraphRegistryArtifact[]> {
  const { spec, assets, timestamp, projectRoot, applyTemplateSubstitutions } =
    input;
  const templateJson = await readGraphTemplateFile(projectRoot, spec.kind);
  const substitutedTemplate = applyTemplateSubstitutions(templateJson, spec);
  const contentRoot = getContentRoot(projectRoot);
  const graphsRoot = join(getRegistryRoot(contentRoot), "graphs");
  const registryId = registryIdForPageSpec(spec);
  const artifacts: GraphRegistryArtifact[] = [];

  for (const asset of Object.values(assets)) {
    if (asset.type !== "graph") {
      continue;
    }

    const graphId = asset.graphId;
    const record = JSON.parse(substitutedTemplate) as Record<string, unknown>;
    record.id = graphId;
    record.slug = graphId.replace(/^graph\./, "");
    record.subjectId = registryId;
    record.tags = spec.tags;
    record.status = spec.status;
    record.createdAt = timestamp;
    record.updatedAt = timestamp;

    if (spec.graph?.nodes) {
      const structure = buildGraphStructureFromSpecNodes(spec.graph.nodes);
      record.rootNodeId = structure.rootNodeId;
      record.nodes = structure.nodes;
      record.edges = structure.edges;
    }

    const parsed = graphRecordSchema.parse(record);
    artifacts.push({
      graphId,
      path: join(graphsRoot, `${parsed.slug}.json`),
      record: parsed,
      json: `${JSON.stringify(parsed, null, 2)}\n`,
    });
  }

  return artifacts;
}
