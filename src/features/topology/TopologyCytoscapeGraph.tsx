"use client";

import type {
  Core as CytoscapeCore,
  ElementDefinition as CytoscapeElementDefinition,
  StylesheetJson as CytoscapeStylesheetJson,
} from "cytoscape";
import cytoscape from "cytoscape";
import { Maximize2, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import type { TopologyDocsPageContentByRegistryId } from "./topology-content";
import type {
  TopologyEdge,
  TopologyGraph,
  TopologyNode,
} from "./topology-data";

type TopologyCytoscapeGraphProps = {
  docsPageContentByRegistryId: TopologyDocsPageContentByRegistryId;
  graph: TopologyGraph;
  pageKindLabels: UiMessages["pageKind"];
  text: UiMessages["topologyPrototype"];
};

type SelectedGraphItem =
  | { kind: "node"; nodeId: string }
  | { kind: "edge"; edgeId: string }
  | null;

const topologyNodePositions: Record<string, { x: number; y: number }> = {
  "classification.neural-network-components": { x: 360, y: 40 },
  "classification.activation-functions": { x: 160, y: 120 },
  "classification.feed-forward-networks": { x: 560, y: 120 },
  "concept.activation": { x: 120, y: 300 },
  "module.relu": { x: 300, y: 230 },
  "module.leaky-relu": { x: 455, y: 245 },
  "module.silu": { x: 650, y: 315 },
  "module.swiglu": { x: 430, y: 470 },
  "module.standard-ffn": { x: 185, y: 480 },
  "module.feed-forward-network": { x: 650, y: 500 },
};

const fallbackColumns = [
  { x: 120, y: 240 },
  { x: 300, y: 140 },
  { x: 500, y: 220 },
  { x: 300, y: 420 },
  { x: 560, y: 430 },
] as const;

const topologyStylesheet: CytoscapeStylesheetJson = [
  {
    selector: "node",
    style: {
      "background-color": "#1f3b43",
      "border-color": "#7aa6ad",
      "border-width": 1.5,
      color: "#f1eadb",
      "font-family": "Inter, sans-serif",
      "font-size": 12,
      "font-weight": 600,
      height: 58,
      label: "data(label)",
      "overlay-opacity": 0,
      "text-halign": "center",
      "text-max-width": "116px",
      "text-valign": "center",
      "text-wrap": "wrap",
      width: 128,
    },
  },
  {
    selector: "node.classification",
    style: {
      "background-color": "#28394d",
      "border-color": "#e5ba9f",
      shape: "round-rectangle",
    },
  },
  {
    selector: "node.record",
    style: {
      "background-color": "#203f3c",
      shape: "ellipse",
    },
  },
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      color: "#d9cdb6",
      "font-size": 9,
      label: "data(label)",
      "line-color": "#729198",
      opacity: 0.86,
      "target-arrow-color": "#729198",
      "target-arrow-shape": "triangle",
      "text-background-color": "#18272c",
      "text-background-opacity": 0.92,
      "text-background-padding": "3px",
      "text-margin-y": -8,
      width: 1.8,
    },
  },
  {
    selector: "edge.membership",
    style: {
      "line-color": "#6f8588",
      "line-style": "dashed",
      "target-arrow-color": "#6f8588",
    },
  },
  {
    selector: "edge.relationship",
    style: {
      "line-color": "#d69a8c",
      "target-arrow-color": "#d69a8c",
      width: 2.2,
    },
  },
  {
    selector: ":selected",
    style: {
      "border-color": "#f1d6a8",
      "border-width": 3,
      "line-color": "#f1d6a8",
      "target-arrow-color": "#f1d6a8",
    },
  },
];

function getNodeLabel(
  node: TopologyNode,
  text: UiMessages["topologyPrototype"],
) {
  const labelOverrides: Record<string, string> = {
    "concept.activation": text.nodeActivation,
    "module.relu": text.nodeRelu,
    "module.silu": text.nodeSilu,
    "module.swiglu": text.nodeSwiGLU,
    "module.feed-forward-network": text.nodeFeedForward,
  };

  return labelOverrides[node.registryId] ?? node.label;
}

function toCytoscapeElements(
  graph: TopologyGraph,
  text: UiMessages["topologyPrototype"],
): CytoscapeElementDefinition[] {
  const nodes = graph.nodes.map<CytoscapeElementDefinition>((node, index) => ({
    classes: node.kind,
    data: {
      id: node.id,
      kind: node.kind,
      label: getNodeLabel(node, text),
      registryId: node.registryId,
    },
    position:
      topologyNodePositions[node.registryId] ??
      fallbackColumns[index % fallbackColumns.length],
  }));

  const edges = graph.edges.map<CytoscapeElementDefinition>((edge) => ({
    classes:
      edge.kind === "membership"
        ? `membership ${edge.membershipType}`
        : "relationship",
    data: {
      id: edge.id,
      kind: edge.kind,
      label: edge.label,
      source: edge.sourceId,
      target: edge.targetId,
    },
  }));

  return [...nodes, ...edges];
}

function edgeSummary(
  edge: TopologyEdge,
  nodeLabelsById: Map<string, string>,
): string {
  const source = nodeLabelsById.get(edge.sourceId) ?? edge.sourceId;
  const target = nodeLabelsById.get(edge.targetId) ?? edge.targetId;
  return `${source} -> ${edge.label} -> ${target}`;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getClassificationTypeLabel(
  classificationType: string,
  text: UiMessages["topologyPrototype"],
) {
  switch (classificationType) {
    case "domain":
      return text.classificationTypeDomain;
    case "family":
      return text.classificationTypeFamily;
    case "topology":
      return text.classificationTypeTopology;
    default:
      return titleCase(classificationType);
  }
}

function getRecordSummary(
  node: Extract<TopologyNode, { kind: "record" }>,
  docsPageContentByRegistryId: TopologyDocsPageContentByRegistryId,
  text: UiMessages["topologyPrototype"],
) {
  return (
    docsPageContentByRegistryId[node.registryId]?.summary ??
    text.detailMissingSummary
  );
}

function getRecordTitle(
  node: Extract<TopologyNode, { kind: "record" }>,
  docsPageContentByRegistryId: TopologyDocsPageContentByRegistryId,
  text: UiMessages["topologyPrototype"],
) {
  return (
    docsPageContentByRegistryId[node.registryId]?.title ??
    getNodeLabel(node, text)
  );
}

function getRecordHref(
  node: Extract<TopologyNode, { kind: "record" }>,
  docsPageContentByRegistryId: TopologyDocsPageContentByRegistryId,
) {
  return (
    docsPageContentByRegistryId[node.registryId]?.href ?? node.canonicalHref
  );
}

function getPageKindLabel(
  kind: string,
  pageKindLabels: UiMessages["pageKind"],
) {
  return pageKindLabels[kind] ?? titleCase(kind);
}

export function TopologyCytoscapeGraph({
  docsPageContentByRegistryId,
  graph,
  pageKindLabels,
  text,
}: TopologyCytoscapeGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cytoscapeRef = useRef<CytoscapeCore | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedGraphItem>(null);
  const elements = useMemo(
    () => toCytoscapeElements(graph, text),
    [graph, text],
  );
  const nodeLabelsById = useMemo(
    () =>
      new Map(
        graph.nodes.map((node) => [node.id, getNodeLabel(node, text)] as const),
      ),
    [graph.nodes, text],
  );
  const nodesById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node] as const)),
    [graph.nodes],
  );
  const edgesById = useMemo(
    () => new Map(graph.edges.map((edge) => [edge.id, edge] as const)),
    [graph.edges],
  );
  const visibleMemberCountByClassificationId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const edge of graph.edges) {
      if (edge.kind !== "membership") {
        continue;
      }

      counts.set(edge.sourceId, (counts.get(edge.sourceId) ?? 0) + 1);
    }

    return counts;
  }, [graph.edges]);
  const legendItems = useMemo(
    () =>
      [...new Map(graph.edges.map((edge) => [edge.label, edge])).values()].map(
        (edge) => ({
          label: edge.label,
          description:
            edge.kind === "membership"
              ? text.membershipLegendDescription
              : text.relationshipLegendDescription,
        }),
      ),
    [graph.edges, text],
  );

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    if (selectedItem.kind === "node" && !nodesById.has(selectedItem.nodeId)) {
      setSelectedItem(null);
      return;
    }

    if (selectedItem.kind === "edge" && !edgesById.has(selectedItem.edgeId)) {
      setSelectedItem(null);
    }
  }, [edgesById, nodesById, selectedItem]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const canvas = document.createElement("canvas");
    if (canvas.getContext("2d") === null) {
      setIsReady(true);
      return;
    }

    const cy = cytoscape({
      autoungrabify: true,
      boxSelectionEnabled: false,
      container: containerRef.current,
      elements,
      layout: { name: "preset", fit: true, padding: 34 },
      maxZoom: 2.2,
      minZoom: 0.45,
      style: topologyStylesheet,
      userPanningEnabled: true,
      userZoomingEnabled: true,
    });

    cytoscapeRef.current = cy;
    cy.on("tap", "node", (event) => {
      setSelectedItem({ kind: "node", nodeId: event.target.id() });
    });
    cy.on("tap", "edge", (event) => {
      setSelectedItem({ kind: "edge", edgeId: event.target.id() });
    });
    cy.on("tap", (event) => {
      if (event.target === cy) {
        setSelectedItem(null);
      }
    });
    cy.ready(() => {
      cy.fit(undefined, 34);
      setIsReady(true);
    });

    return () => {
      cy.destroy();
      cytoscapeRef.current = null;
      setIsReady(false);
    };
  }, [elements]);

  useEffect(() => {
    const cy = cytoscapeRef.current;
    if (!cy) {
      return;
    }

    cy.elements().unselect();

    if (!selectedItem) {
      return;
    }

    const selectedElement =
      selectedItem.kind === "node"
        ? cy.getElementById(selectedItem.nodeId)
        : cy.getElementById(selectedItem.edgeId);

    if (selectedElement.length > 0) {
      selectedElement.select();
    }
  }, [selectedItem]);

  const fitGraph = useCallback(() => {
    cytoscapeRef.current?.fit(undefined, 34);
  }, []);

  const resetGraph = useCallback(() => {
    const cy = cytoscapeRef.current;
    if (!cy) {
      return;
    }

    cy.reset();
    cy.fit(undefined, 34);
    setSelectedItem(null);
  }, []);

  const selectedNode =
    selectedItem?.kind === "node"
      ? nodesById.get(selectedItem.nodeId)
      : undefined;
  const selectedEdge =
    selectedItem?.kind === "edge"
      ? edgesById.get(selectedItem.edgeId)
      : undefined;

  return (
    <article
      className="rounded-lg border border-border bg-card p-4"
      aria-labelledby="topology-success-title"
      data-cytoscape-graph="true"
      data-graph-interaction-pan="true"
      data-graph-interaction-zoom="true"
      data-graph-node-count={String(graph.nodes.length)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="topology-success-title"
            className="text-lg font-semibold text-foreground"
          >
            {text.successTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {text.successDescription}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fitGraph}
            aria-label={text.fitGraphLabel}
            title={text.fitGraphLabel}
          >
            <Maximize2 data-icon="inline-start" />
            {text.fitGraphLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={resetGraph}
            aria-label={text.resetGraphLabel}
            title={text.resetGraphLabel}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>

      <div
        className="relative mt-4 h-[28rem] min-h-[22rem] overflow-hidden rounded-lg border border-border bg-background md:h-[34rem]"
        role="img"
        aria-label={text.graphLabel}
      >
        <div ref={containerRef} className="h-full w-full" />
        {isReady ? null : (
          <div className="absolute inset-0 grid place-items-center bg-background/82 text-sm text-muted-foreground">
            {text.loadingTitle}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
        <h3 className="text-sm font-semibold text-foreground">
          {text.legendTitle}
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label={text.legendTitle}>
          {legendItems.map((item) => (
            <li
              key={item.label}
              className="rounded-md border border-border bg-background/70 px-2 py-1 text-xs text-muted-foreground"
            >
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="ml-1">{item.description}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-3 lg:grid-cols-2">
          <section
            className="rounded-lg border border-border bg-muted/20 p-3"
            aria-labelledby="topology-node-list-title"
          >
            <h3
              id="topology-node-list-title"
              className="text-sm font-semibold text-foreground"
            >
              {text.accessibleNodeListTitle}
            </h3>
            <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
              {graph.nodes.map((node) => {
                const isSelected =
                  selectedItem?.kind === "node" &&
                  selectedItem.nodeId === node.id;

                return (
                  <li
                    key={node.id}
                    className="flex flex-wrap items-center gap-2"
                    data-registry-id={node.registryId}
                  >
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setSelectedItem({ kind: "node", nodeId: node.id })
                      }
                    >
                      {getNodeLabel(node, text)}
                    </Button>
                    <span className="rounded-md border border-border px-1.5 py-0.5 text-[0.7rem] uppercase">
                      {node.kind === "classification"
                        ? text.classificationNodeLabel
                        : getPageKindLabel(node.recordKind, pageKindLabels)}
                    </span>
                    {node.kind === "record" &&
                    getRecordHref(node, docsPageContentByRegistryId) ? (
                      <a
                        className="text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                        href={getRecordHref(node, docsPageContentByRegistryId)}
                      >
                        {text.detailOpenCanonicalPage}
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            className="rounded-lg border border-border bg-muted/20 p-3"
            aria-labelledby="topology-edge-list-title"
          >
            <h3
              id="topology-edge-list-title"
              className="text-sm font-semibold text-foreground"
            >
              {text.accessibleRelationshipListTitle}
            </h3>
            <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
              {graph.edges.map((edge) => {
                const isSelected =
                  selectedItem?.kind === "edge" &&
                  selectedItem.edgeId === edge.id;

                return (
                  <li key={edge.id}>
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      className="h-auto min-h-8 w-full justify-start px-2 py-1.5 text-left whitespace-normal"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setSelectedItem({ kind: "edge", edgeId: edge.id })
                      }
                    >
                      {edgeSummary(edge, nodeLabelsById)}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section
          className="rounded-lg border border-border bg-muted/20 p-4"
          aria-labelledby="topology-detail-panel-title"
          tabIndex={-1}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                id="topology-detail-panel-title"
                className="text-sm font-semibold text-foreground"
              >
                {text.detailPanelTitle}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {text.detailPanelHint}
              </p>
            </div>
            {selectedItem ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={text.detailPanelDismissLabel}
                title={text.detailPanelDismissLabel}
                onClick={() => setSelectedItem(null)}
              >
                <X />
              </Button>
            ) : null}
          </div>

          {!selectedNode && !selectedEdge ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                {text.detailPanelEmptyTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {text.detailPanelEmptyDescription}
              </p>
            </div>
          ) : null}

          {selectedNode?.kind === "record" ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {getRecordTitle(
                    selectedNode,
                    docsPageContentByRegistryId,
                    text,
                  )}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {getPageKindLabel(selectedNode.recordKind, pageKindLabels)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {text.detailLabelSummary}
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {getRecordSummary(
                    selectedNode,
                    docsPageContentByRegistryId,
                    text,
                  )}
                </p>
              </div>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {text.detailLabelPrimaryClassification}
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {selectedNode.primaryClassificationLabel ??
                      text.selectedViewNone}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {text.detailLabelSecondaryClassifications}
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {selectedNode.secondaryClassificationLabels.length > 0
                      ? selectedNode.secondaryClassificationLabels.join(", ")
                      : text.detailNoSecondaryClassifications}
                  </dd>
                </div>
                {getRecordHref(selectedNode, docsPageContentByRegistryId) ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {text.detailLabelCanonicalPage}
                    </dt>
                    <dd className="mt-1">
                      <a
                        className="text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                        href={getRecordHref(
                          selectedNode,
                          docsPageContentByRegistryId,
                        )}
                      >
                        {text.detailOpenCanonicalPage}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          {selectedNode?.kind === "classification" ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {getNodeLabel(selectedNode, text)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {text.classificationNodeLabel}
                </p>
              </div>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {text.detailLabelScope}
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {getClassificationTypeLabel(
                      selectedNode.classificationType,
                      text,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {text.detailLabelAppliesTo}
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {selectedNode.classifiesKinds
                      .map((kind) => getPageKindLabel(kind, pageKindLabels))
                      .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {text.detailLabelVisibleMembers}
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {String(
                      visibleMemberCountByClassificationId.get(
                        selectedNode.id,
                      ) ?? 0,
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {selectedEdge ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {selectedEdge.label}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {text.detailLabelRelationship}
                </p>
              </div>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {text.detailLabelSource}
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {nodeLabelsById.get(selectedEdge.sourceId) ??
                      selectedEdge.sourceId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {text.detailLabelTarget}
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {nodeLabelsById.get(selectedEdge.targetId) ??
                      selectedEdge.targetId}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}
