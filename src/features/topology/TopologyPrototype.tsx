import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildTopologyGraph,
  DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS,
  type TopologyNode,
} from "./topology-data";

type TopologyPrototypeProps = {
  messages: UiMessages;
};

const previewPositions: Record<string, string> = {
  "classification.activation-functions": "left-[5%] top-[10%]",
  "classification.feed-forward-networks": "left-[58%] top-[10%]",
  "classification.neural-network-components": "left-[34%] top-[6%]",
  "concept.activation": "left-[8%] top-[42%]",
  "module.relu": "left-[33%] top-[28%]",
  "module.leaky-relu": "left-[54%] top-[30%]",
  "module.silu": "left-[72%] top-[42%]",
  "module.swiglu": "left-[43%] top-[68%]",
  "module.standard-ffn": "left-[17%] top-[68%]",
  "module.feed-forward-network": "left-[69%] top-[70%]",
};

const fallbackPositions = [
  "left-[8%] top-[38%]",
  "left-[32%] top-[18%]",
  "left-[58%] top-[34%]",
  "left-[38%] top-[66%]",
  "left-[70%] top-[66%]",
] as const;

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

export function TopologyPrototype({ messages }: TopologyPrototypeProps) {
  const text = messages.topologyPrototype;
  const graph = buildTopologyGraph(DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS);
  const chips = [
    text.activationChip,
    text.activationFunctionChip,
    text.feedForwardChip,
  ];
  const previewNodes = graph.nodes.slice(0, 10);

  return (
    <section className="space-y-6" aria-labelledby="topology-success-title">
      <fieldset className="rounded-lg border border-border bg-card/60 p-4">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {text.selectedViewLabel}
        </legend>
        <p className="mt-1 text-sm text-foreground">{text.selectedViewValue}</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Classifications">
          {chips.map((chip) => (
            <li key={chip}>
              <span className="rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                {chip}
              </span>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="grid gap-3 md:grid-cols-3">
        <article
          className="rounded-lg border border-border bg-muted/20 p-4"
          aria-labelledby="topology-loading-title"
        >
          <h2
            id="topology-loading-title"
            className="text-sm font-semibold text-foreground"
          >
            {text.loadingTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {text.loadingDescription}
          </p>
        </article>
        <article
          className="rounded-lg border border-border bg-muted/20 p-4"
          aria-labelledby="topology-empty-title"
        >
          <h2
            id="topology-empty-title"
            className="text-sm font-semibold text-foreground"
          >
            {text.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {text.emptyDescription}
          </p>
        </article>
        <article
          className="rounded-lg border border-border bg-muted/20 p-4"
          aria-labelledby="topology-error-title"
        >
          <h2
            id="topology-error-title"
            className="text-sm font-semibold text-foreground"
          >
            {text.errorTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {text.errorDescription}
          </p>
        </article>
      </div>

      <article
        className="rounded-lg border border-border bg-card p-4"
        aria-labelledby="topology-success-title"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="topology-success-title"
            className="text-lg font-semibold text-foreground"
          >
            {text.successTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {text.successDescription}
          </p>
        </div>
        <div
          className="relative mt-4 h-72 overflow-hidden rounded-lg border border-border bg-background"
          role="img"
          aria-label={text.graphLabel}
        >
          <div className="absolute left-[16%] top-[48%] h-px w-[30%] rotate-[-24deg] bg-primary/60" />
          <div className="absolute left-[41%] top-[34%] h-px w-[26%] rotate-[13deg] bg-primary/60" />
          <div className="absolute left-[45%] top-[58%] h-px w-[24%] rotate-[33deg] bg-primary/60" />
          <div className="absolute left-[52%] top-[74%] h-px w-[22%] bg-primary/60" />
          {previewNodes.map((node, index) => (
            <span
              key={node.id}
              className={`${
                previewPositions[node.registryId] ??
                fallbackPositions[index % fallbackPositions.length]
              } absolute max-w-36 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground shadow-sm`}
              data-registry-id={node.registryId}
            >
              {getNodeLabel(node, text)}
            </span>
          ))}
        </div>
        <ul
          className="mt-4 flex flex-wrap gap-2"
          aria-label="Derived topology relationships"
        >
          {graph.edges.slice(0, 8).map((edge) => (
            <li
              key={edge.id}
              className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground"
            >
              {edge.label}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
