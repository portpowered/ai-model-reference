"use client";

import type {
  Edge,
  EdgeProps,
  EdgeTypes,
  FitViewOptions,
  Node,
  NodeProps,
  NodeTypes,
} from "@xyflow/react";
import {
  Background,
  BaseEdge,
  type DefaultEdgeOptions,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  type OnError,
  Position,
  type ProOptions,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { Expand, X } from "lucide-react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import {
  createContext,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { InlineMath } from "@/features/docs/components/Math";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import type { GraphLegendItem } from "@/features/graphs/components/GraphFrame";
import {
  buildRegistryGraphFlowNodeThemeStyle,
  REGISTRY_GRAPH_FLOW_INTERACTION,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE,
} from "@/features/models/components/registry-graph-flow-theme";
import type {
  RegistryFlowEdgeData,
  RegistryFlowNodeData,
} from "@/lib/content/graph-flow";
import {
  buildRegistryFlowGraph,
  buildRegistryFlowNodeType,
  GraphRenderIssueError,
} from "@/lib/content/graph-flow";
import { getGraphSubjectMessages } from "@/lib/content/graph-message-runtime";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import type { RegistryKind } from "@/lib/content/schemas";
import { cn } from "@/lib/utils";

const FLOW_NODE_HEIGHT_ESTIMATE = 112;
const FLOW_VIEWPORT_PADDING_Y = 24;
const FLOW_MIN_VIEWPORT_HEIGHT = 360;
const FLOW_MAX_VIEWPORT_HEIGHT = 560;
const FLOW_EXPANDED_MIN_VIEWPORT_HEIGHT = 448;
const FLOW_EXPANDED_VIEWPORT_HEIGHT = "max(28rem, calc(100dvh - 8rem))";

const registryGraphNodeTypes: NodeTypes = {
  canonicalReference: CanonicalReferenceNode,
  structural: StructuralNode,
  annotation: AnnotationNode,
  operator: OperatorNode,
  architectureBlock: ArchitectureBlockNode,
  fallback: FallbackNode,
};

const registryGraphEdgeTypes: EdgeTypes = {
  interactiveDependency: InteractiveDependencyEdge,
};

const REGISTRY_GRAPH_FLOW_FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: 0.08,
  maxZoom: 1.15,
};

function RegistryGraphFlowFitView({
  viewportRef,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const refit = () => {
      requestAnimationFrame(() => {
        void fitView(REGISTRY_GRAPH_FLOW_FIT_VIEW_OPTIONS);
      });
    };

    refit();

    const observer = new ResizeObserver(refit);
    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [fitView, viewportRef]);

  return null;
}

const REGISTRY_GRAPH_FLOW_DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: "straight",
  style: { strokeWidth: 3 },
};

const REGISTRY_GRAPH_FLOW_PRO_OPTIONS: ProOptions = {
  hideAttribution: true,
};

const GRAPH_INLINE_MATH_PATTERN =
  /\\[a-zA-Z]+|[A-Za-z]\([^)]*\)\s*\^[^\s]+|[A-Za-z0-9)}\]]_[A-Za-z0-9{(\\]|[φΦϕ]/u;

type ActiveRegistryGraphNode = {
  canonicalPageHref?: string;
  entityKind?: RegistryKind;
  hasCanonicalPage: boolean;
  id: string;
  interactionKind: RegistryFlowNodeData["semantic"]["interactionKind"];
  relatedPageHref?: string;
  relatedPageTitle?: string;
  resolvedSummary?: string;
  resolvedTitle: string;
};

type RegistryGraphFlowInteractionContextValue = {
  activeNodeId?: string;
  openNodePopup: (node: ActiveRegistryGraphNode) => void;
  popupId: string;
};

export const RegistryGraphFlowInteractionContext =
  createContext<RegistryGraphFlowInteractionContextValue | null>(null);

type ActiveRegistryGraphEdge = {
  id: string;
  relationshipSummary: string;
  sourcePageHref?: string;
  sourcePageTitle?: string;
  sourceTitle: string;
  targetPageHref?: string;
  targetPageTitle?: string;
  targetTitle: string;
};

type RegistryGraphFlowEdgeInteractionContextValue = {
  activeEdgeId?: string;
  openEdgePopup: (edge: ActiveRegistryGraphEdge) => void;
  popupId: string;
};

export const RegistryGraphFlowEdgeInteractionContext =
  createContext<RegistryGraphFlowEdgeInteractionContextValue | null>(null);

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
    case "moe-expert-node":
      return "registry-graph-flow__process-node registry-graph-flow__process-node--moe-expert";
    case "moe-merge-node":
      return "registry-graph-flow__process-node registry-graph-flow__process-node--moe-merge";
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
    case "moe-expert-node":
    case "moe-merge-node":
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

export function nodeVisualRoleHasHandles(
  visualRole: RegistryFlowNodeData["visualRole"],
): boolean {
  return (
    visualRole === "query-head" ||
    visualRole === "key-head" ||
    visualRole === "value-head" ||
    visualRole === "timeline-node" ||
    visualRole === "timeline-node-muted" ||
    visualRole === "summary-node" ||
    visualRole === "process-node" ||
    visualRole === "moe-expert-node" ||
    visualRole === "moe-merge-node" ||
    visualRole === "latent-node" ||
    visualRole === "group-container" ||
    visualRole === "architecture-embedding" ||
    visualRole === "architecture-attention" ||
    visualRole === "architecture-feed-forward" ||
    visualRole === "architecture-add-norm" ||
    visualRole === "architecture-linear" ||
    visualRole === "architecture-softmax" ||
    visualRole === "architecture-io" ||
    visualRole === "operator-circle" ||
    visualRole === "default"
  );
}

function RegistryGraphFlowNodeBody({
  nodeId,
  data,
  summaryAffordance = false,
}: {
  nodeId: string;
  data: RegistryFlowNodeData;
  summaryAffordance?: boolean;
}) {
  const interactionContext = useContext(RegistryGraphFlowInteractionContext);
  const visualRole = data.visualRole ?? "default";
  const hasHandles = nodeVisualRoleHasHandles(visualRole);
  const className = getAttentionHeadNodeClassName(visualRole);
  const isInteractiveNode =
    interactionContext !== null && data.semantic.interactionKind !== "none";
  const isActive = interactionContext?.activeNodeId === nodeId;

  const openNodePopup = () => {
    if (!interactionContext || data.semantic.interactionKind === "none") {
      return;
    }

    interactionContext.openNodePopup({
      id: nodeId,
      resolvedTitle: data.semantic.resolvedTitle,
      resolvedSummary: data.semantic.resolvedSummary,
      entityKind: data.semantic.entityKind,
      hasCanonicalPage: data.semantic.hasCanonicalPage,
      canonicalPageHref: data.semantic.canonicalPageHref,
      interactionKind: data.semantic.interactionKind,
      relatedPageHref: data.semantic.relatedPageHref,
      relatedPageTitle: data.semantic.relatedPageTitle,
    });
  };

  const handleNodeKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openNodePopup();
  };

  const nodeContent = (
    <>
      <GraphNodeLabel label={data.label} />
      {summaryAffordance ? (
        <span
          className="registry-graph-flow__summary-affordance"
          aria-hidden="true"
        >
          Summary available
        </span>
      ) : null}
    </>
  );

  return (
    <div
      className={cn(
        className,
        summaryAffordance
          ? "registry-graph-flow__default-node--has-summary"
          : undefined,
      )}
      data-graph-visual-role={visualRole}
      data-graph-node-family={data.nodeFamily}
      data-graph-node-type={buildRegistryFlowNodeType(data.nodeFamily)}
      data-graph-summary-affordance={summaryAffordance ? "true" : "false"}
      data-graph-node-interactive={isInteractiveNode ? "true" : "false"}
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
          {isInteractiveNode ? (
            <button
              type="button"
              className="registry-graph-flow__node-button nodrag nopan"
              aria-controls={interactionContext?.popupId}
              aria-expanded={isActive ? "true" : "false"}
              aria-haspopup="dialog"
              aria-label={`Open ${data.semantic.resolvedTitle} details`}
              data-graph-node-button="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openNodePopup();
              }}
              onKeyDown={handleNodeKeyDown}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              {nodeContent}
            </button>
          ) : (
            <div className="registry-graph-flow__node-content">
              {nodeContent}
            </div>
          )}
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
        <div className="registry-graph-flow__node-content">{nodeContent}</div>
      )}
    </div>
  );
}

export function CanonicalReferenceNode({
  id,
  data,
}: NodeProps<Node<RegistryFlowNodeData, "canonicalReference">>) {
  return <RegistryGraphFlowNodeBody nodeId={id} data={data} />;
}

export function StructuralNode({
  id,
  data,
}: NodeProps<Node<RegistryFlowNodeData, "structural">>) {
  return <RegistryGraphFlowNodeBody nodeId={id} data={data} />;
}

export function AnnotationNode({
  id,
  data,
}: NodeProps<Node<RegistryFlowNodeData, "annotation">>) {
  return <RegistryGraphFlowNodeBody nodeId={id} data={data} />;
}

export function OperatorNode({
  id,
  data,
}: NodeProps<Node<RegistryFlowNodeData, "operator">>) {
  return <RegistryGraphFlowNodeBody nodeId={id} data={data} />;
}

export function ArchitectureBlockNode({
  id,
  data,
}: NodeProps<Node<RegistryFlowNodeData, "architectureBlock">>) {
  return <RegistryGraphFlowNodeBody nodeId={id} data={data} />;
}

export function FallbackNode({
  id,
  data,
}: NodeProps<Node<RegistryFlowNodeData, "fallback">>) {
  return (
    <RegistryGraphFlowNodeBody
      nodeId={id}
      data={data}
      summaryAffordance={data.semantic.summarySource === "graph-local"}
    />
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

function formatRegistryKindLabel(kind?: RegistryKind): string | null {
  switch (kind) {
    case "concept":
      return "Concept";
    case "model":
      return "Model";
    case "module":
      return "Module";
    case "paper":
      return "Paper";
    case "training-regime":
      return "Training regime";
    case "system":
      return "System";
    case "dataset":
      return "Dataset";
    case "organization":
      return "Organization";
    case "tag":
      return "Tag";
    case "citation":
      return "Citation";
    case "graph":
      return "Graph";
    default:
      return null;
  }
}

export function RegistryGraphFlowNodePopup({
  activeNode,
  onClose,
  popupId,
}: {
  activeNode: ActiveRegistryGraphNode | null;
  onClose: () => void;
  popupId: string;
}) {
  if (!activeNode) {
    return null;
  }

  const entityKindLabel = formatRegistryKindLabel(activeNode.entityKind);
  const isGraphLocalPopup = activeNode.interactionKind === "graph-local";
  const popupKindLabel = isGraphLocalPopup
    ? "Graph-local explanation"
    : entityKindLabel;
  const popupSummary = activeNode.resolvedSummary
    ? activeNode.resolvedSummary
    : isGraphLocalPopup
      ? "This graph node has local context, but its short explanation is not available yet."
      : "This graph node has a canonical target, but its short summary is not available yet.";
  const popupLinkHref = isGraphLocalPopup
    ? activeNode.relatedPageHref
    : activeNode.hasCanonicalPage
      ? activeNode.canonicalPageHref
      : undefined;
  const popupLinkLabel = isGraphLocalPopup
    ? activeNode.relatedPageTitle
      ? `Open ${activeNode.relatedPageTitle}`
      : "Open related docs page"
    : "Open canonical docs page";

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:max-w-md">
      <section
        id={popupId}
        role="dialog"
        aria-modal="false"
        aria-label={`${activeNode.resolvedTitle} details`}
        className="registry-graph-flow__popup pointer-events-auto"
        data-testid="registry-graph-node-popup"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {popupKindLabel ? (
              <p className="registry-graph-flow__popup-kind">
                {popupKindLabel}
              </p>
            ) : null}
            <h3 className="registry-graph-flow__popup-title">
              {activeNode.resolvedTitle}
            </h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            aria-label={`Close ${activeNode.resolvedTitle} details`}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <p className="registry-graph-flow__popup-summary">{popupSummary}</p>
        {popupLinkHref ? (
          <a href={popupLinkHref} className="registry-graph-flow__popup-link">
            {popupLinkLabel}
          </a>
        ) : null}
      </section>
    </div>
  );
}

function buildInteractiveDependencyEdgeLabel(
  data?: RegistryFlowEdgeData,
): string {
  const sourceTitle = data?.semantic.sourceTitle ?? "Source node";
  const targetTitle = data?.semantic.targetTitle ?? "Target node";
  return `Open relationship details: ${targetTitle} depends on ${sourceTitle}`;
}

export function InteractiveDependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<Edge<RegistryFlowEdgeData>>) {
  const interactionContext = useContext(
    RegistryGraphFlowEdgeInteractionContext,
  );
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const semantic = data?.semantic;
  const isInteractive =
    Boolean(semantic?.interactionEnabled) && interactionContext !== null;
  const isActive = interactionContext?.activeEdgeId === id;
  const accessibleLabel = buildInteractiveDependencyEdgeLabel(
    data as RegistryFlowEdgeData | undefined,
  );

  const openEdgePopup = () => {
    if (!interactionContext || !semantic?.interactionEnabled) {
      return;
    }

    interactionContext.openEdgePopup({
      id,
      relationshipSummary:
        semantic.relationshipSummary ??
        `${semantic.targetTitle} depends on ${semantic.sourceTitle}.`,
      sourceTitle: semantic.sourceTitle,
      targetTitle: semantic.targetTitle,
      ...(semantic.sourcePageHref
        ? { sourcePageHref: semantic.sourcePageHref }
        : {}),
      ...(semantic.sourcePageTitle
        ? { sourcePageTitle: semantic.sourcePageTitle }
        : {}),
      ...(semantic.targetPageHref
        ? { targetPageHref: semantic.targetPageHref }
        : {}),
      ...(semantic.targetPageTitle
        ? { targetPageTitle: semantic.targetPageTitle }
        : {}),
    });
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {isInteractive ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="registry-graph-flow__edge-button nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            aria-controls={interactionContext.popupId}
            aria-expanded={isActive ? "true" : "false"}
            aria-haspopup="dialog"
            aria-label={accessibleLabel}
            data-graph-edge-button="true"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openEdgePopup();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              openEdgePopup();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            <span className="sr-only">{accessibleLabel}</span>
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export function RegistryGraphFlowEdgePopup({
  activeEdge,
  onClose,
  popupId,
}: {
  activeEdge: ActiveRegistryGraphEdge | null;
  onClose: () => void;
  popupId: string;
}) {
  if (!activeEdge) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:max-w-md">
      <section
        id={popupId}
        role="dialog"
        aria-modal="false"
        aria-label={`${activeEdge.sourceTitle} and ${activeEdge.targetTitle} relationship details`}
        className="registry-graph-flow__popup pointer-events-auto"
        data-testid="registry-graph-edge-popup"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="registry-graph-flow__popup-kind">Dependency edge</p>
            <h3 className="registry-graph-flow__popup-title">
              {activeEdge.sourceTitle}
              {" and "}
              {activeEdge.targetTitle}
            </h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            aria-label={`Close ${activeEdge.sourceTitle} and ${activeEdge.targetTitle} relationship details`}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <p className="registry-graph-flow__popup-summary">
          {activeEdge.relationshipSummary}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {activeEdge.sourcePageHref ? (
            <a
              href={activeEdge.sourcePageHref}
              className="registry-graph-flow__popup-link"
            >
              {`Open ${activeEdge.sourcePageTitle ?? activeEdge.sourceTitle}`}
            </a>
          ) : null}
          {activeEdge.targetPageHref ? (
            <a
              href={activeEdge.targetPageHref}
              className="registry-graph-flow__popup-link"
            >
              {`Open ${activeEdge.targetPageTitle ?? activeEdge.targetTitle}`}
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function RegistryGraphFlowSurface({
  assetId,
  activeEdge,
  activeNode,
  graphId,
  accessibleLabel,
  nodes,
  edges,
  onCloseEdgePopup,
  onCloseNodePopup,
  onExpand,
  onOpenEdgePopup,
  onOpenNodePopup,
  edgePopupId,
  popupId,
  viewportStyle,
}: {
  assetId: string;
  activeEdge: ActiveRegistryGraphEdge | null;
  activeNode: ActiveRegistryGraphNode | null;
  graphId: string;
  accessibleLabel: string;
  edges: ReturnType<typeof buildRegistryFlowGraph>["edges"];
  nodes: ReturnType<typeof buildRegistryFlowGraph>["nodes"];
  onCloseEdgePopup: () => void;
  onCloseNodePopup: () => void;
  onExpand?: () => void;
  onOpenEdgePopup: (edge: ActiveRegistryGraphEdge) => void;
  onOpenNodePopup: (node: ActiveRegistryGraphNode) => void;
  edgePopupId: string;
  popupId: string;
  viewportStyle: CSSProperties;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const handleReactFlowError: OnError = (id, message) => {
    if (id === "002" || id === "004") {
      return;
    }
    throw new GraphRenderIssueError(graphId, [`react-flow ${id}: ${message}`]);
  };
  const renderedNodes = nodes.map((node) =>
    node.data.semantic.interactionKind !== "none"
      ? {
          ...node,
          style: {
            ...node.style,
            pointerEvents: "all" as const,
          },
        }
      : node,
  );
  return (
    <RegistryGraphFlowInteractionContext.Provider
      value={{
        activeNodeId: activeNode?.id,
        openNodePopup: onOpenNodePopup,
        popupId,
      }}
    >
      <RegistryGraphFlowEdgeInteractionContext.Provider
        value={{
          activeEdgeId: activeEdge?.id,
          openEdgePopup: onOpenEdgePopup,
          popupId: edgePopupId,
        }}
      >
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
              {edges.map((edge) => (
                <span
                  key={edge.id}
                  data-graph-edge-id={edge.id}
                  data-graph-edge-family={edge.data?.edgeFamily ?? "fallback"}
                  data-graph-edge-kind={
                    edge.data?.semantic.edgeKind ?? "data-flow"
                  }
                  data-graph-edge-source={edge.source}
                  data-graph-edge-target={edge.target}
                  data-graph-edge-interactive={
                    edge.data?.semantic.interactionEnabled ? "true" : "false"
                  }
                >
                  {edge.data?.semantic.sourceTitle ?? edge.source}
                  {" to "}
                  {edge.data?.semantic.targetTitle ?? edge.target}
                </span>
              ))}
            </div>
            <div
              ref={viewportRef}
              className="registry-graph-flow__viewport w-full max-w-full overflow-hidden"
              style={viewportStyle}
            >
              <ReactFlow
                nodes={renderedNodes}
                edges={edges}
                onError={handleReactFlowError}
                fitView
                fitViewOptions={REGISTRY_GRAPH_FLOW_FIT_VIEW_OPTIONS}
                nodeTypes={registryGraphNodeTypes}
                edgeTypes={registryGraphEdgeTypes}
                defaultEdgeOptions={REGISTRY_GRAPH_FLOW_DEFAULT_EDGE_OPTIONS}
                nodesDraggable={REGISTRY_GRAPH_FLOW_INTERACTION.nodesDraggable}
                nodesConnectable={
                  REGISTRY_GRAPH_FLOW_INTERACTION.nodesConnectable
                }
                elementsSelectable={
                  REGISTRY_GRAPH_FLOW_INTERACTION.elementsSelectable
                }
                panOnDrag={REGISTRY_GRAPH_FLOW_INTERACTION.panOnDrag}
                zoomOnScroll={REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnScroll}
                zoomOnPinch={REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnPinch}
                zoomOnDoubleClick={
                  REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnDoubleClick
                }
                preventScrolling={
                  REGISTRY_GRAPH_FLOW_INTERACTION.preventScrolling
                }
                proOptions={REGISTRY_GRAPH_FLOW_PRO_OPTIONS}
              >
                <Background gap={16} size={1} />
                <RegistryGraphFlowFitView viewportRef={viewportRef} />
              </ReactFlow>
            </div>
            <RegistryGraphFlowNodePopup
              activeNode={activeNode}
              onClose={onCloseNodePopup}
              popupId={popupId}
            />
            <RegistryGraphFlowEdgePopup
              activeEdge={activeEdge}
              onClose={onCloseEdgePopup}
              popupId={edgePopupId}
            />
          </div>
        </div>
      </RegistryGraphFlowEdgeInteractionContext.Provider>
    </RegistryGraphFlowInteractionContext.Provider>
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
  const popupId = useId();
  const edgePopupId = useId();
  const graphRecord = getGraphById(graphId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [activeNode, setActiveNode] = useState<ActiveRegistryGraphNode | null>(
    null,
  );
  const [activeEdge, setActiveEdge] = useState<ActiveRegistryGraphEdge | null>(
    null,
  );

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
  const handleOpenNodePopup = (node: ActiveRegistryGraphNode) => {
    setActiveEdge(null);
    setActiveNode((current) => (current?.id === node.id ? null : node));
  };
  const handleOpenEdgePopup = (edge: ActiveRegistryGraphEdge) => {
    setActiveNode(null);
    setActiveEdge((current) => (current?.id === edge.id ? null : edge));
  };

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
        if (activeNode) {
          setActiveNode(null);
          return;
        }
        if (activeEdge) {
          setActiveEdge(null);
          return;
        }
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeEdge, activeNode, isExpanded]);

  useEffect(() => {
    if ((!activeNode && !activeEdge) || isExpanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveNode(null);
        setActiveEdge(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeEdge, activeNode, isExpanded]);

  return (
    <>
      <RegistryGraphFlowSurface
        assetId={assetId}
        activeEdge={activeEdge}
        activeNode={activeNode}
        graphId={graphId}
        accessibleLabel={accessibleLabel}
        nodes={nodes}
        edges={edges}
        onCloseEdgePopup={() => setActiveEdge(null)}
        onCloseNodePopup={() => setActiveNode(null)}
        onOpenEdgePopup={handleOpenEdgePopup}
        onOpenNodePopup={handleOpenNodePopup}
        viewportStyle={compactViewportStyle}
        onExpand={() => setIsExpanded(true)}
        edgePopupId={edgePopupId}
        popupId={popupId}
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
                      activeEdge={activeEdge}
                      activeNode={activeNode}
                      graphId={graphId}
                      accessibleLabel={accessibleLabel}
                      nodes={nodes}
                      edges={edges}
                      onCloseEdgePopup={() => setActiveEdge(null)}
                      onCloseNodePopup={() => setActiveNode(null)}
                      onOpenEdgePopup={handleOpenEdgePopup}
                      onOpenNodePopup={handleOpenNodePopup}
                      edgePopupId={edgePopupId}
                      popupId={popupId}
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
  title,
  legend,
}: {
  assetId: string;
  graphId: string;
  alt?: string;
  caption?: string;
  title?: string;
  legend?: readonly GraphLegendItem[];
}) {
  const accessibleLabel = alt ?? `Graph ${graphId}`;

  return (
    <figure className="registry-graph-flow-figure">
      {title ? (
        <div
          className="mb-3 text-center text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase"
          data-graph-title={graphId}
        >
          {title}
        </div>
      ) : null}
      <ReactFlowProvider>
        <RegistryGraphFlowCanvas
          assetId={assetId}
          graphId={graphId}
          alt={accessibleLabel}
        />
      </ReactFlowProvider>
      {legend && legend.length > 0 ? (
        <div
          className="mt-3 flex flex-wrap items-center justify-center gap-4 rounded-xl border border-border/60 bg-card/35 px-4 py-3 text-sm"
          data-graph-legend={graphId}
        >
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
