import type { UiMessages } from "@/lib/content/ui-messages.types";

type TopologyPrototypeProps = {
  messages: UiMessages;
};

const previewNodes = [
  { key: "nodeActivation", className: "left-[8%] top-[38%]" },
  { key: "nodeRelu", className: "left-[38%] top-[16%]" },
  { key: "nodeSilu", className: "left-[63%] top-[34%]" },
  { key: "nodeSwiGLU", className: "left-[42%] top-[66%]" },
  { key: "nodeFeedForward", className: "left-[72%] top-[66%]" },
] as const;

export function TopologyPrototype({ messages }: TopologyPrototypeProps) {
  const text = messages.topologyPrototype;
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
          <div className="absolute left-[18%] top-[48%] h-px w-[28%] rotate-[-24deg] bg-primary/60" />
          <div className="absolute left-[45%] top-[31%] h-px w-[26%] rotate-[18deg] bg-primary/60" />
          <div className="absolute left-[47%] top-[55%] h-px w-[24%] rotate-[35deg] bg-primary/60" />
          <div className="absolute left-[55%] top-[72%] h-px w-[21%] bg-primary/60" />
          {previewNodes.map((node) => (
            <span
              key={node.key}
              className={`${node.className} absolute rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground shadow-sm`}
            >
              {text[node.key]}
            </span>
          ))}
        </div>
      </article>
    </section>
  );
}
