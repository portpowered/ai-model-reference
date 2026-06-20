"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chrono } from "react-chrono";
import type { OntologyTimelineItem } from "@/lib/content/ontology-timeline";

type OntologyChronoTimelineProps = {
  items: readonly OntologyTimelineItem[];
  labels: {
    regionLabel: string;
    docsLink: string;
    sourcePrefix: string;
  };
};

const chronoTheme = {
  cardBgColor: "#1e2b31",
  cardDetailsBackGround: "#1e2b31",
  cardDetailsColor: "#f6f1df",
  cardSubtitleColor: "#ada99c",
  cardTitleColor: "#f6f1df",
  detailsColor: "#f6f1df",
  iconBackgroundColor: "#5f9aaa",
  iconColor: "#fffaf0",
  primary: "#5f9aaa",
  secondary: "#df8f7d",
  titleColor: "#ada99c",
  titleColorActive: "#f6f1df",
  toolbarBgColor: "#182329",
  toolbarBtnBgColor: "#26363d",
  toolbarTextColor: "#f6f1df",
} as const;

function toChronoItems(items: readonly OntologyTimelineItem[]) {
  return items.map((item) => ({
    id: item.registryId,
    title: item.dateLabel,
    cardTitle: item.title,
    cardSubtitle: `${item.dateKind} ${item.dateLabel}`,
    cardDetailedText: item.summary,
    date: item.dateValue,
  }));
}

export function OntologyChronoTimeline({
  items,
  labels,
}: OntologyChronoTimelineProps) {
  const [isMounted, setIsMounted] = useState(false);
  const chronoItems = useMemo(() => toChronoItems(items), [items]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section
      aria-label={labels.regionLabel}
      className="ontology-timeline"
      data-testid="ontology-chrono-timeline"
    >
      <ol className="ontology-timeline__event-list">
        {items.map((item) => (
          <li className="ontology-timeline__event" key={item.registryId}>
            <article
              className="ontology-timeline__card"
              data-registry-id={item.registryId}
            >
              <p className="ontology-timeline__date">
                {item.dateKind} {item.dateLabel}
              </p>
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              <div className="ontology-timeline__meta">
                {item.href ? (
                  <Link href={item.href}>{labels.docsLink}</Link>
                ) : null}
                {item.source ? (
                  <span>
                    {labels.sourcePrefix} {item.source.title}
                  </span>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ol>
      <div className="ontology-timeline__chrono-shell">
        {isMounted ? (
          <Chrono
            items={chronoItems}
            mode="vertical"
            theme={chronoTheme}
            layout={{
              cardHeight: 220,
              cardWidth: 520,
              pointSize: 18,
              responsive: { enabled: true, breakpoint: 768 },
            }}
            content={{
              alignment: { horizontal: "left", vertical: "top" },
              compactText: false,
              semanticTags: { title: "h2", subtitle: "span" },
            }}
            display={{
              borderless: true,
              toolbar: { enabled: false },
            }}
            interaction={{
              autoScroll: true,
              cardHover: true,
              keyboardNavigation: true,
              pointClick: true,
            }}
            darkMode={{ enabled: true, showToggle: false }}
          />
        ) : (
          <div className="ontology-timeline__loading" role="status">
            Loading timeline renderer...
          </div>
        )}
      </div>
    </section>
  );
}
