import {
  loadOntologyTimelineData,
  type OntologyTimelineResult,
} from "@/lib/content/ontology-timeline";
import type { UiMessages } from "@/lib/content/ui-messages";
import type { SiteLocale } from "@/lib/i18n/locale-routing";
import { OntologyTimelineClientPage } from "./OntologyTimelineClientPage";

type OntologyTimelinePageProps = {
  locale: SiteLocale;
  messages: UiMessages;
};

const DEFAULT_TIMELINE_CLASSIFICATION = "activation";

function normalizeRequestedClassification(value: string): string {
  return value.trim().toLowerCase();
}

function registerPreloadedTimeline(
  preloadedTimelines: Record<string, OntologyTimelineResult>,
  requestedClassification: string,
  timeline: OntologyTimelineResult,
) {
  preloadedTimelines[
    normalizeRequestedClassification(requestedClassification)
  ] = timeline;

  if (timeline.classification) {
    preloadedTimelines[
      normalizeRequestedClassification(timeline.classification.slug)
    ] = timeline;
  }
}

export function loadPreloadedTimelineSelections(
  locale: SiteLocale,
): Record<string, OntologyTimelineResult> {
  const queue = [DEFAULT_TIMELINE_CLASSIFICATION];
  const seen = new Set<string>();
  const preloadedTimelines: Record<string, OntologyTimelineResult> = {};

  while (queue.length > 0) {
    const requestedClassification = queue.shift();
    if (!requestedClassification) {
      continue;
    }

    const normalizedClassification = normalizeRequestedClassification(
      requestedClassification,
    );
    if (seen.has(normalizedClassification)) {
      continue;
    }
    seen.add(normalizedClassification);

    const timeline = loadOntologyTimelineData(requestedClassification, locale);
    registerPreloadedTimeline(
      preloadedTimelines,
      requestedClassification,
      timeline,
    );

    for (const nearbySlug of [
      timeline.classification?.slug,
      ...timeline.nearbyClassifications.map(
        (classification) => classification.slug,
      ),
    ]) {
      if (!nearbySlug) {
        continue;
      }

      const normalizedNearbySlug = normalizeRequestedClassification(nearbySlug);
      if (!seen.has(normalizedNearbySlug)) {
        queue.push(nearbySlug);
      }
    }
  }

  return preloadedTimelines;
}

export function OntologyTimelinePage({
  locale,
  messages,
}: OntologyTimelinePageProps) {
  const preloadedTimelines = loadPreloadedTimelineSelections(locale);
  const initialTimeline =
    preloadedTimelines[DEFAULT_TIMELINE_CLASSIFICATION] ??
    loadOntologyTimelineData(DEFAULT_TIMELINE_CLASSIFICATION, locale);

  return (
    <OntologyTimelineClientPage
      initialTimeline={initialTimeline}
      locale={locale}
      messages={messages}
      preloadedTimelines={preloadedTimelines}
    />
  );
}
