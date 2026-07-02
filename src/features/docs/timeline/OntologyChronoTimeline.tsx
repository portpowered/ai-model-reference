"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OntologyTimelineItem } from "@/lib/content/ontology-timeline";

type OntologyChronoTimelineProps = {
  items: readonly OntologyTimelineItem[];
  labels: {
    regionLabel: string;
    docsLink: string;
    sourcePrefix: string;
    loadingTitle: string;
    loadingDescription: string;
    errorTitle: string;
    errorDescription: string;
  };
};

const timelineShellClassName =
  "rounded-[var(--radius)]  bg-card/40 px-4 py-4 md:px-6";

const timelineListClassName =
  "relative m-0 list-none p-0 before:absolute before:bottom-0 before:left-5 before:top-6 before:w-1 before:-translate-x-1/2 before:rounded-full before:bg-primary";

const timelineItemClassName =
  "relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 pb-6 last:pb-0";

const timelineDotClassName =
  "mt-4 block h-4 w-4 rounded-full bg-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.16)]";

const timelineCardClassName =
  "rounded-[var(--radius)] border border-zinc-800 bg-zinc-950 px-6 py-5";

const timelineDateClassName =
  "m-0 text-sm font-semibold uppercase tracking-[0.04em] text-primary";

const timelineTitleLinkClassName =
  "text-[1.9rem] font-medium leading-tight text-zinc-50 no-underline transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

const timelineTitleClassName =
  "m-0 text-[1.9rem] font-medium leading-tight text-zinc-50";

const timelineSummaryClassName = "m-0 text-lg leading-8 text-zinc-400";

const timelineStateClassName =
  "flex min-h-72 flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-border bg-card/60 p-6 text-center text-muted-foreground";

const timelineStateTitleClassName =
  "m-0 text-base font-semibold text-foreground";

const timelineStateBodyClassName = "m-0 max-w-[32rem]";

function renderTimelineItems(
  items: readonly OntologyTimelineItem[],
  _labels: OntologyChronoTimelineProps["labels"],
) {
  return (
    <ol className={timelineListClassName}>
      {items.map((item) => (
        <li className={timelineItemClassName} key={item.registryId}>
          <div aria-hidden="true" className="flex justify-center">
            <span className={timelineDotClassName} />
          </div>
          <article
            className={timelineCardClassName}
            data-registry-id={item.registryId}
          >
            <div className="flex flex-col gap-5">
              <p className={timelineDateClassName}>
                {item.dateKind} {item.dateLabel}
              </p>
              <div className="flex flex-col gap-4">
                {item.href ? (
                  <Link className={timelineTitleLinkClassName} href={item.href}>
                    {item.title}
                  </Link>
                ) : (
                  <h2 className={timelineTitleClassName}>{item.title}</h2>
                )}
                <p className={timelineSummaryClassName}>{item.summary}</p>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}

export function OntologyChronoTimeline({
  items,
  labels,
}: OntologyChronoTimelineProps) {
  const [isMounted, setIsMounted] = useState(false);
  const renderedItems = useMemo(
    () => renderTimelineItems(items, labels),
    [items, labels],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section
      aria-label={labels.regionLabel}
      className={timelineShellClassName}
      data-testid="ontology-chrono-timeline"
    >
      {isMounted ? (
        renderedItems
      ) : (
        <div
          aria-live="polite"
          className={timelineStateClassName}
          data-testid="ontology-timeline-loading"
          role="status"
        >
          <p className={timelineStateTitleClassName}>{labels.loadingTitle}</p>
          <p className={timelineStateBodyClassName}>
            {labels.loadingDescription}
          </p>
        </div>
      )}
    </section>
  );
}
