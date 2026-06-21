"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterChipNav } from "@/features/docs/components/FilterChipNav";
import {
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
} from "@/lib/content/topology-navigation";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { cn } from "@/lib/utils";
import { TopologyCytoscapeGraph } from "./TopologyCytoscapeGraph";
import type { TopologyDocsPageContentByRegistryId } from "./topology-content";
import {
  buildTopologyGraph,
  resolveTopologyClassificationId,
} from "./topology-data";
import { buildTopologyHref, parseTopologyQuery } from "./topology-query";

type TopologyPrototypeProps = {
  docsPageContentByRegistryId: TopologyDocsPageContentByRegistryId;
  messages: UiMessages;
};

export function TopologyPrototype({
  messages,
  docsPageContentByRegistryId,
}: TopologyPrototypeProps) {
  const pathname = usePathname() ?? "/topology";
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = messages.topologyPrototype;
  const queryState = useMemo(
    () => parseTopologyQuery(searchParams),
    [searchParams],
  );
  const defaultTopologyHref = buildTopologyHref(pathname, [], searchParams);
  const graph = buildTopologyGraph(queryState.selectors);
  const chips = useMemo(
    () =>
      listTopologyNavigationOptions({
        labels: getTopologyNavigationLabels(messages),
      }).map((option) => ({
        classificationId: option.classificationId,
        selector: option.classificationSlug,
        label: option.label,
      })),
    [messages],
  );
  const activeClassificationIds = new Set(
    graph.selectedClassifications.map(
      (selection) => selection.classificationId,
    ),
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
    const classificationId = resolveTopologyClassificationId(selector);
    if (classificationId && activeClassificationIds.has(classificationId)) {
      updateSelection(
        queryState.selectors.filter(
          (item) => resolveTopologyClassificationId(item) !== classificationId,
        ),
        { explicitEmpty: true },
      );
      return;
    }

    updateSelection([...queryState.selectors, selector]);
  }

  function navigateToDefaultTopology(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    globalThis.location.assign(defaultTopologyHref);
  }

  const filterItems = chips.map((chip) => {
    const isActive = activeClassificationIds.has(chip.classificationId);
    const href = buildTopologyHref(
      pathname,
      isActive
        ? queryState.selectors.filter(
            (item) =>
              resolveTopologyClassificationId(item) !== chip.classificationId,
          )
        : [...queryState.selectors, chip.selector],
      searchParams,
      isActive ? { explicitEmpty: true } : undefined,
    );

    return {
      id: chip.selector,
      href,
      label: chip.label,
      active: isActive,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        toggleSelector(chip.selector);
      },
    };
  });

  return (
    <section className="space-y-6" aria-labelledby="topology-success-title">
      <div className="flex items-start gap-2">
        <FilterChipNav
          className="min-w-0 flex-1"
          itemClassName="shrink-0"
          items={filterItems}
          labels={{ navigation: text.chipListLabel }}
          listClassName="flex-nowrap overflow-x-auto pb-1 pr-2"
        />
        {activeClassificationIds.size > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label={text.clearSelectionLabel}
            title={text.clearSelectionLabel}
            onClick={() => updateSelection([], { explicitEmpty: true })}
          >
            <X />
          </Button>
        ) : null}
      </div>

      {graph.status === "success" ? (
        <TopologyCytoscapeGraph
          docsPageContentByRegistryId={docsPageContentByRegistryId}
          graph={graph}
          pageKindLabels={messages.pageKind}
          text={text}
        />
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
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4",
            )}
            href={defaultTopologyHref}
            onClick={navigateToDefaultTopology}
          >
            {text.emptyReturnAction}
          </Link>
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
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4",
            )}
            href={defaultTopologyHref}
            onClick={navigateToDefaultTopology}
          >
            {text.errorReturnAction}
          </Link>
        </article>
      ) : null}
    </section>
  );
}
