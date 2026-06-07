"use client";

import { Background, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import type { CSSProperties } from "react";
import { MissingGraphRecord } from "@/features/docs/components/MissingGraphRecord";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import {
  buildRegistryGraphFlowNodeThemeStyle,
  REGISTRY_GRAPH_FLOW_INTERACTION,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE,
} from "@/features/models/components/registry-graph-flow-theme";
import { buildRegistryFlowGraph } from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";

function RegistryGraphFlowCanvas({
  assetId,
  graphId,
  alt,
}: {
  assetId: string;
  graphId: string;
  alt: string;
}) {
  const { messages } = usePageMessages();
  const graphRecord = getGraphById(graphId);

  if (!graphRecord) {
    return <MissingGraphRecord graphId={graphId} />;
  }

  const { nodes, edges } = buildRegistryFlowGraph(graphRecord, messages);
  const accessibleLabel = alt.length > 0 ? alt : graphId;

  return (
    <div
      data-page-asset={assetId}
      data-asset-type="graph"
      data-graph-id={graphId}
      data-web-renderer="react-flow"
      data-react-flow-graph="true"
      data-manual-visibility-evidence={
        REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE
      }
      data-graph-node-count={String(nodes.length)}
      data-graph-interaction-pan={
        REGISTRY_GRAPH_FLOW_INTERACTION.panOnDrag ? "true" : "false"
      }
      data-graph-interaction-zoom={
        REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnScroll &&
        REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnPinch
          ? "true"
          : "false"
      }
      data-graph-interaction-editing={
        REGISTRY_GRAPH_FLOW_INTERACTION.nodesDraggable ||
        REGISTRY_GRAPH_FLOW_INTERACTION.nodesConnectable ||
        REGISTRY_GRAPH_FLOW_INTERACTION.elementsSelectable
          ? "true"
          : "false"
      }
      className="registry-graph-flow w-full min-w-0"
      style={buildRegistryGraphFlowNodeThemeStyle() as CSSProperties}
      role="img"
      aria-label={accessibleLabel}
    >
      <div className="sr-only" aria-hidden="false">
        {nodes.map((node) => (
          <span key={node.id} data-graph-node-id={node.id}>
            {node.data.label}
          </span>
        ))}
      </div>
      <div className="registry-graph-flow__viewport h-[min(420px,70vh)] min-h-[220px] w-full max-w-full overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={REGISTRY_GRAPH_FLOW_INTERACTION.nodesDraggable}
          nodesConnectable={REGISTRY_GRAPH_FLOW_INTERACTION.nodesConnectable}
          elementsSelectable={
            REGISTRY_GRAPH_FLOW_INTERACTION.elementsSelectable
          }
          panOnDrag={REGISTRY_GRAPH_FLOW_INTERACTION.panOnDrag}
          zoomOnScroll={REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnScroll}
          zoomOnPinch={REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnPinch}
          zoomOnDoubleClick={REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnDoubleClick}
          preventScrolling={REGISTRY_GRAPH_FLOW_INTERACTION.preventScrolling}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

export function RegistryGraphFlow({
  assetId,
  graphId,
  alt,
  caption,
}: {
  assetId: string;
  graphId: string;
  alt?: string;
  caption?: string;
}) {
  const accessibleLabel = alt ?? `Graph ${graphId}`;

  return (
    <figure className="registry-graph-flow-figure">
      <ReactFlowProvider>
        <RegistryGraphFlowCanvas
          assetId={assetId}
          graphId={graphId}
          alt={accessibleLabel}
        />
      </ReactFlowProvider>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
