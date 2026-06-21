"use client";

import { useEffect, useState } from "react";
import type { OntologyTimelineResult } from "@/lib/content/ontology-timeline";
import type { UiMessages } from "@/lib/content/ui-messages";
import type { SiteLocale } from "@/lib/i18n/locale-routing";
import { OntologyTimelineView } from "./OntologyTimelineView";
import { normalizeTimelineClassificationSelector } from "./timeline-query";

type OntologyTimelineClientPageProps = {
  locale: SiteLocale;
  messages: UiMessages;
  initialTimeline: OntologyTimelineResult;
  preloadedTimelines: Record<string, OntologyTimelineResult>;
};

function buildUnknownTimelineResult(
  requestedClassification: string,
  initialTimeline: OntologyTimelineResult,
): OntologyTimelineResult {
  return {
    status: "empty",
    reason: "unknown-classification",
    requestedClassification,
    items: [],
    nearbyClassifications: initialTimeline.nearbyClassifications.map(
      (chip) => ({
        ...chip,
        active: false,
      }),
    ),
  };
}

function resolveTimelineFromLocationSearch(
  locationSearch: string,
  preloadedTimelines: Record<string, OntologyTimelineResult>,
  initialTimeline: OntologyTimelineResult,
): OntologyTimelineResult {
  const classification = normalizeTimelineClassificationSelector(
    new URLSearchParams(locationSearch).get("classification"),
  );

  return (
    preloadedTimelines[classification] ??
    buildUnknownTimelineResult(classification, initialTimeline)
  );
}

export function OntologyTimelineClientPage({
  locale,
  messages,
  initialTimeline,
  preloadedTimelines,
}: OntologyTimelineClientPageProps) {
  const [timeline, setTimeline] = useState(initialTimeline);

  useEffect(() => {
    const syncTimeline = () => {
      setTimeline(
        resolveTimelineFromLocationSearch(
          window.location.search,
          preloadedTimelines,
          initialTimeline,
        ),
      );
    };

    syncTimeline();
    window.addEventListener("popstate", syncTimeline);

    return () => {
      window.removeEventListener("popstate", syncTimeline);
    };
  }, [initialTimeline, preloadedTimelines]);

  function handleSelectClassification(classification: string) {
    setTimeline(
      preloadedTimelines[
        normalizeTimelineClassificationSelector(classification)
      ] ?? buildUnknownTimelineResult(classification, initialTimeline),
    );
  }

  return (
    <OntologyTimelineView
      locale={locale}
      messages={messages}
      onSelectClassification={handleSelectClassification}
      fallbackChips={initialTimeline.nearbyClassifications}
      timeline={timeline}
    />
  );
}
