"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { TopologyCytoscapeGraph } from "./TopologyCytoscapeGraph";
import { buildTopologyGraph } from "./topology-data";
import { buildTopologyHref, parseTopologyQuery } from "./topology-query";

type TopologyPrototypeProps = {
  messages: UiMessages;
};

const topologyChips = [
  { selector: "activation", labelKey: "activationChip" },
  { selector: "activation-function", labelKey: "activationFunctionChip" },
  { selector: "feed-forward", labelKey: "feedForwardChip" },
] as const;

export function TopologyPrototype({ messages }: TopologyPrototypeProps) {
  const pathname = usePathname() ?? "/topology";
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = messages.topologyPrototype;
  const queryState = useMemo(
    () => parseTopologyQuery(searchParams),
    [searchParams],
  );
  const graph = buildTopologyGraph(queryState.selectors);
  const chips = topologyChips.map((chip) => ({
    selector: chip.selector,
    label: text[chip.labelKey],
  }));
  const activeSelectors = new Set(queryState.selectors);

  const selectedViewValue =
    queryState.selectors.length === 0
      ? text.selectedViewNone
      : queryState.usesDefault
        ? text.selectedViewValue
        : formatSelectedViewValue(
            chips,
            activeSelectors,
            queryState.selectors,
            text.selectedViewDefault,
          );

  const emptySelectionLabel =
    graph.status === "empty" && graph.selectedClassifications.length > 0
      ? graph.selectedClassifications
          .map((selection) => selection.classification.slug)
          .join(", ")
      : null;

  function updateSelection(
    nextSelectors: string[],
    options?: { explicitEmpty?: boolean },
  ) {
    router.push(
      buildTopologyHref(pathname, nextSelectors, searchParams, options),
    );
  }

  function toggleSelector(selector: string) {
    if (activeSelectors.has(selector)) {
      updateSelection(
        queryState.selectors.filter((item) => item !== selector),
        { explicitEmpty: true },
      );
      return;
    }

    updateSelection([...queryState.selectors, selector]);
  }

  return (
    <section className="space-y-6" aria-labelledby="topology-success-title">
      <fieldset className="rounded-lg border border-border bg-card/60 p-4">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {text.selectedViewLabel}
        </legend>
        <p className="mt-1 text-sm text-foreground">{selectedViewValue}</p>
        <p className="mt-2 text-xs text-muted-foreground">{text.chipHint}</p>
        <ul
          className="mt-3 flex flex-wrap gap-2"
          aria-label={text.chipListLabel}
        >
          {chips.map((chip) => {
            const isActive = activeSelectors.has(chip.selector);

            return (
              <li key={chip.selector}>
                <Button
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  aria-pressed={isActive}
                  onClick={() => toggleSelector(chip.selector)}
                >
                  {chip.label}
                </Button>
              </li>
            );
          })}
        </ul>
        {!queryState.usesDefault ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => updateSelection([])}
          >
            {text.resetToDefaultLabel}
          </Button>
        ) : null}
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

      {graph.status === "empty" ? (
        <article
          className="rounded-lg border border-border bg-card p-4"
          aria-labelledby="topology-empty-state-title"
        >
          <h2
            id="topology-empty-state-title"
            className="text-lg font-semibold text-foreground"
          >
            {text.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {graph.reason === "no-selection"
              ? text.emptyNoSelectionDescription
              : `${text.emptySelectedPrefix}: ${emptySelectionLabel ?? text.selectedViewNone}.`}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => updateSelection([])}
          >
            {text.emptyReturnAction}
          </Button>
        </article>
      ) : null}

      {graph.status === "error" ? (
        <article
          className="rounded-lg border border-destructive/40 bg-card p-4"
          aria-labelledby="topology-error-state-title"
        >
          <h2
            id="topology-error-state-title"
            className="text-lg font-semibold text-foreground"
          >
            {text.errorTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {text.errorInvalidPrefix}: {graph.invalidSelections.join(", ")}.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => updateSelection([])}
          >
            {text.errorReturnAction}
          </Button>
        </article>
      ) : null}
    </section>
  );
}

function formatSelectedViewValue(
  chips: { selector: string; label: string }[],
  activeSelectors: Set<string>,
  selectors: string[],
  fallback: string,
): string {
  const matchingLabels = chips
    .filter((chip) => activeSelectors.has(chip.selector))
    .map((chip) => chip.label);

  if (matchingLabels.length > 0) {
    return matchingLabels.join(" + ");
  }

  return selectors.join(" + ") || fallback;
}
