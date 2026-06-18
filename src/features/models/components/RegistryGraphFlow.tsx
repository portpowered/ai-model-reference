"use client";

import type { FitViewOptions, Node, NodeProps, NodeTypes } from "@xyflow/react";
import {
  Background,
  type DefaultEdgeOptions,
  Handle,
  type OnError,
  Position,
  type ProOptions,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { Expand, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { InlineMath } from "@/features/docs/components/Math";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import {
  buildRegistryGraphFlowNodeThemeStyle,
  REGISTRY_GRAPH_FLOW_INTERACTION,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE,
} from "@/features/models/components/registry-graph-flow-theme";
import type { RegistryFlowNodeData } from "@/lib/content/graph-flow";
import {
  buildRegistryFlowGraph,
  GraphRenderIssueError,
} from "@/lib/content/graph-flow";
import { getGraphSubjectMessages } from "@/lib/content/graph-message-runtime";
import { getGraphById } from "@/lib/content/graph-registry-runtime";

const FLOW_NODE_HEIGHT_ESTIMATE = 112;
const FLOW_VIEWPORT_PADDING_Y = 24;
const FLOW_MIN_VIEWPORT_HEIGHT = 360;
const FLOW_MAX_VIEWPORT_HEIGHT = 560;
const FLOW_EXPANDED_MIN_VIEWPORT_HEIGHT = 448;
const FLOW_EXPANDED_VIEWPORT_HEIGHT = "max(28rem, calc(100dvh - 8rem))";

const attentionHeadNodeTypes: NodeTypes = {
  attentionHead: AttentionHeadNode,
};

const REGISTRY_GRAPH_FLOW_FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: 0.08,
  maxZoom: 1.15,
};

const REGISTRY_GRAPH_FLOW_DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: "straight",
  style: { strokeWidth: 3 },
};

const REGISTRY_GRAPH_FLOW_PRO_OPTIONS: ProOptions = {
  hideAttribution: true,
};

const GRAPH_INLINE_MATH_PATTERN =
  /\\[a-zA-Z]+|[A-Za-z]\([^)]*\)\s*\^[^\s]+|[A-Za-z0-9)}\]]_[A-Za-z0-9{(\\]|[φΦϕ]/u;

function normalizeGraphInlineFormula(label: string): string {
  return label
    .replace(/\bphi\b/g, "\\phi")
    .replace(/\^T\b/g, "^{\\top}")
    .replace(/\^t\b/g, "^{\\top}");
}

function shouldRenderGraphInlineMath(label: string): boolean {
  if (!GRAPH_INLINE_MATH_PATTERN.test(label)) {
    return false;
  }

  const tokens = label.trim().split(/\s+/).filter(Boolean);
  const proseTokens = tokens.filter((token) =>
    /^[A-Za-z][A-Za-z-]+$/.test(token),
  );

  if (tokens.length > 2 && proseTokens.length > 0) {
    return false;
  }

  if (tokens.length > 1 && proseTokens.length > 1) {
    return false;
  }

  return true;
}

export function GraphNodeLabel({ label }: { label: string }) {
  if (shouldRenderGraphInlineMath(label)) {
    return (
      <span className="registry-graph-flow__math-label">
        <InlineMath formula={normalizeGraphInlineFormula(label)} />
      </span>
    );
  }

  const parts = label.split(/(\s+)/);
  const hasInlineMath = parts.some(
    (part) => part.trim().length > 0 && shouldRenderGraphInlineMath(part),
  );

  if (!hasInlineMath) {
    return <span>{label}</span>;
  }

  return (
    <span>
      {parts.reduce<ReactNode[]>((nodes, part, index) => {
        const key = `${index}-${part}`;

        if (part.trim().length === 0) {
          nodes.push(<span key={`space-${key}`}>{part}</span>);
          return nodes;
        }

        if (!shouldRenderGraphInlineMath(part)) {
          nodes.push(<span key={`text-${key}`}>{part}</span>);
          return nodes;
        }

        nodes.push(
          <span key={`math-${key}`} className="registry-graph-flow__math-label">
            <InlineMath formula={normalizeGraphInlineFormula(part)} />
          </span>,
        );

        return nodes;
      }, [])}
    </span>
  );
}

function getAttentionHeadNodeClassName(
  visualRole: RegistryFlowNodeData["visualRole"],
): string {
  switch (visualRole) {
    case "row-label":
      return "registry-graph-flow__row-label";
    case "query-head":
      return "registry-graph-flow__head-box registry-graph-flow__head-box--query";
    case "key-head":
      return "registry-graph-flow__head-box registry-graph-flow__head-box--key";
    case "value-head":
      return "registry-graph-flow__head-box registry-graph-flow__head-box--value";
    case "timeline-node":
      return "registry-graph-flow__timeline-node";
    case "timeline-node-muted":
      return "registry-graph-flow__timeline-node registry-graph-flow__timeline-node--muted";
    case "summary-node":
      return "registry-graph-flow__summary-node";
    case "process-node":
      return "registry-graph-flow__process-node";
    case "latent-node":
      return "registry-graph-flow__latent-node";
    case "annotation":
      return "registry-graph-flow__annotation";
    case "group-container":
      return "registry-graph-flow__group-container";
    case "repeat-label":
      return "registry-graph-flow__repeat-label";
    case "architecture-embedding":
      return "registry-graph-flow__architecture-node registry-graph-flow__architecture-node--embedding";
    case "architecture-attention":
      return "registry-graph-flow__architecture-node registry-graph-flow__architecture-node--attention";
    case "architecture-feed-forward":
      return "registry-graph-flow__architecture-node registry-graph-flow__architecture-node--feed-forward";
    case "architecture-add-norm":
      return "registry-graph-flow__architecture-node registry-graph-flow__architecture-node--add-norm";
    case "architecture-linear":
      return "registry-graph-flow__architecture-node registry-graph-flow__architecture-node--linear";
    case "architecture-softmax":
      return "registry-graph-flow__architecture-node registry-graph-flow__architecture-node--softmax";
    case "architecture-io":
      return "registry-graph-flow__architecture-node registry-graph-flow__architecture-node--io";
    case "operator-circle":
      return "registry-graph-flow__operator-circle";
    default:
      return "registry-graph-flow__default-node";
  }
}

function estimateNodeHeight(
  node: ReturnType<typeof buildRegistryFlowGraph>["nodes"][number],
): number {
  switch (node.data.visualRole) {
    case "annotation":
      return 160;
    case "group-container":
      return node.data.size?.height ?? 320;
    case "repeat-label":
      return 96;
    case "row-label":
      return 48;
    case "query-head":
    case "key-head":
    case "value-head":
      return 96;
    case "timeline-node":
    case "timeline-node-muted":
      return 56;
    case "summary-node":
    case "process-node":
    case "latent-node":
      return 64;
    case "architecture-embedding":
    case "architecture-attention":
    case "architecture-feed-forward":
    case "architecture-add-norm":
    case "architecture-linear":
    case "architecture-softmax":
    case "architecture-io":
      return node.data.size?.height ?? 72;
    case "operator-circle":
      return node.data.size?.height ?? 52;
    default:
      return FLOW_NODE_HEIGHT_ESTIMATE;
  }
}

function AttentionHeadNode({
  data,
}: NodeProps<Node<RegistryFlowNodeData, "attentionHead">>) {
  const visualRole = data.visualRole ?? "default";
  const isHeadBox =
    visualRole === "query-head" ||
    visualRole === "key-head" ||
    visualRole === "value-head";
  const hasHandles =
    isHeadBox ||
    visualRole === "timeline-node" ||
    visualRole === "timeline-node-muted" ||
    visualRole === "summary-node" ||
    visualRole === "process-node" ||
    visualRole === "latent-node" ||
    visualRole === "architecture-embedding" ||
    visualRole === "architecture-attention" ||
    visualRole === "architecture-feed-forward" ||
    visualRole === "architecture-add-norm" ||
    visualRole === "architecture-linear" ||
    visualRole === "architecture-softmax" ||
    visualRole === "architecture-io" ||
    visualRole === "operator-circle" ||
    visualRole === "default";

  return (
    <div
      className={getAttentionHeadNodeClassName(visualRole)}
      data-graph-visual-role={visualRole}
    >
      {hasHandles ? (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="target-top"
            className="registry-graph-flow__handle"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="target-right"
            className="registry-graph-flow__handle"
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="target-bottom"
            className="registry-graph-flow__handle"
          />
          <Handle
            type="target"
            position={Position.Left}
            id="target-left"
            className="registry-graph-flow__handle"
          />
          <GraphNodeLabel label={data.label} />
          <Handle
            type="source"
            position={Position.Bottom}
            id="source-bottom"
            className="registry-graph-flow__handle"
          />
          <Handle
            type="source"
            position={Position.Top}
            id="source-top"
            className="registry-graph-flow__handle"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="source-right"
            className="registry-graph-flow__handle"
          />
          <Handle
            type="source"
            position={Position.Left}
            id="source-left"
            className="registry-graph-flow__handle"
          />
        </>
      ) : (
        <GraphNodeLabel label={data.label} />
      )}
    </div>
  );
}

function buildRegistryGraphFlowViewportStyle(
  nodes: ReturnType<typeof buildRegistryFlowGraph>["nodes"],
  expanded = false,
): CSSProperties {
  const maxY = Math.max(
    ...nodes.map((node) => node.position.y + estimateNodeHeight(node)),
    0,
  );
  const compactHeight = Math.min(
    FLOW_MAX_VIEWPORT_HEIGHT,
    Math.max(FLOW_MIN_VIEWPORT_HEIGHT, maxY + FLOW_VIEWPORT_PADDING_Y),
  );
  const expandedHeight = Math.max(
    FLOW_EXPANDED_MIN_VIEWPORT_HEIGHT,
    maxY + FLOW_VIEWPORT_PADDING_Y,
  );

  return {
    height: expanded
      ? `max(${FLOW_EXPANDED_VIEWPORT_HEIGHT}, ${expandedHeight}px)`
      : compactHeight,
    width: "100%",
  };
}

function RegistryGraphFlowSurface({
  assetId,
  graphId,
  accessibleLabel,
  nodes,
  edges,
  onExpand,
  viewportStyle,
}: {
  assetId: string;
  graphId: string;
  accessibleLabel: string;
  edges: ReturnType<typeof buildRegistryFlowGraph>["edges"];
  nodes: ReturnType<typeof buildRegistryFlowGraph>["nodes"];
  onExpand?: () => void;
  viewportStyle: CSSProperties;
}) {
  const handleReactFlowError: OnError = (id, message) => {
    if (id === "002" || id === "004") {
      return;
    }
    throw new GraphRenderIssueError(graphId, [`react-flow ${id}: ${message}`]);
  };

  return (
    <div className="relative w-full min-w-0">
      {onExpand ? (
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          className="absolute top-3 right-3 z-20 border-border/80 bg-background/88 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/72"
          aria-label="Expand graph to full screen"
          title="Expand graph to full screen"
          onClick={onExpand}
        >
          <Expand />
        </Button>
      ) : null}
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
            <span
              key={node.id}
              data-graph-node-id={node.id}
              {...(node.data.headCountRole
                ? { "data-head-count-role": node.data.headCountRole }
                : {})}
            >
              {node.data.label}
            </span>
          ))}
        </div>
        <div
          className="registry-graph-flow__viewport w-full max-w-full overflow-hidden"
          style={viewportStyle}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onError={handleReactFlowError}
            fitView
            fitViewOptions={REGISTRY_GRAPH_FLOW_FIT_VIEW_OPTIONS}
            nodeTypes={attentionHeadNodeTypes}
            defaultEdgeOptions={REGISTRY_GRAPH_FLOW_DEFAULT_EDGE_OPTIONS}
            nodesDraggable={REGISTRY_GRAPH_FLOW_INTERACTION.nodesDraggable}
            nodesConnectable={REGISTRY_GRAPH_FLOW_INTERACTION.nodesConnectable}
            elementsSelectable={
              REGISTRY_GRAPH_FLOW_INTERACTION.elementsSelectable
            }
            panOnDrag={REGISTRY_GRAPH_FLOW_INTERACTION.panOnDrag}
            zoomOnScroll={REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnScroll}
            zoomOnPinch={REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnPinch}
            zoomOnDoubleClick={
              REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnDoubleClick
            }
            preventScrolling={REGISTRY_GRAPH_FLOW_INTERACTION.preventScrolling}
            proOptions={REGISTRY_GRAPH_FLOW_PRO_OPTIONS}
          >
            <Background gap={16} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export function RegistryGraphFlowCanvas({
  assetId,
  graphId,
  alt,
}: {
  assetId: string;
  graphId: string;
  alt: string;
}) {
  const { messages } = usePageMessages();
  const dialogId = useId();
  const graphRecord = getGraphById(graphId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  if (!graphRecord) {
    throw new GraphRenderIssueError(graphId, [
      `missing graph record "${graphId}"`,
    ]);
  }

  const graphSubjectMessages = getGraphSubjectMessages(graphRecord.subjectId);
  const { nodes, edges } = buildRegistryFlowGraph(
    graphRecord,
    messages,
    graphSubjectMessages,
  );
  const accessibleLabel = alt.length > 0 ? alt : graphId;
  const compactViewportStyle = buildRegistryGraphFlowViewportStyle(nodes);
  const expandedViewportStyle = buildRegistryGraphFlowViewportStyle(
    nodes,
    true,
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  return (
    <>
      <RegistryGraphFlowSurface
        assetId={assetId}
        graphId={graphId}
        accessibleLabel={accessibleLabel}
        nodes={nodes}
        edges={edges}
        viewportStyle={compactViewportStyle}
        onExpand={() => setIsExpanded(true)}
      />
      {hasMounted && isExpanded
        ? createPortal(
            <div
              id={dialogId}
              className="fixed inset-0 z-50 bg-background/94 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label={`${accessibleLabel} full-screen view`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
                  <p className="truncate pr-4 text-sm font-medium text-foreground">
                    {accessibleLabel}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Close full-screen graph"
                    onClick={() => setIsExpanded(false)}
                  >
                    <X />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
                  <div className="mx-auto w-full max-w-6xl">
                    <RegistryGraphFlowSurface
                      assetId={assetId}
                      graphId={graphId}
                      accessibleLabel={accessibleLabel}
                      nodes={nodes}
                      edges={edges}
                      viewportStyle={expandedViewportStyle}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
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
