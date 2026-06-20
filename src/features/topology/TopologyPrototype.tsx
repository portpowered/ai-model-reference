import type { UiMessages } from "@/lib/content/ui-messages.types";
import { TopologyCytoscapeGraph } from "./TopologyCytoscapeGraph";
import {
  buildTopologyGraph,
  DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS,
} from "./topology-data";

type TopologyPrototypeProps = {
  messages: UiMessages;
};

export function TopologyPrototype({ messages }: TopologyPrototypeProps) {
  const text = messages.topologyPrototype;
  const graph = buildTopologyGraph(DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS);
  const chips = [
    text.activationChip,
    text.activationFunctionChip,
    text.feedForwardChip,
  ];

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

      {graph.status === "success" ? (
        <TopologyCytoscapeGraph graph={graph} text={text} />
      ) : null}
    </section>
  );
}
