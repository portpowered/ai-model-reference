import { listSupportedOntologyClassificationSelectors } from "@/lib/content/ontology-classification-selectors";
import {
  loadOntologyTimelineData,
  type OntologyTimelineResult,
} from "@/lib/content/ontology-timeline";
import { getClassificationById } from "@/lib/content/registry-runtime";
import type { UiMessages } from "@/lib/content/ui-messages";
import type { SiteLocale } from "@/lib/i18n/locale-routing";
import { OntologyTimelineClientPage } from "./OntologyTimelineClientPage";
import { getDefaultTimelineClassificationSelector } from "./timeline-query";

type OntologyTimelinePageProps = {
  locale: SiteLocale;
  messages: UiMessages;
};

function normalizeRequestedClassification(value: string): string {
  return value.trim().toLowerCase();
}

function registerPreloadedTimeline(
  preloadedTimelines: Record<string, OntologyTimelineResult>,
  requestedClassification: string,
  timeline: OntologyTimelineResult,
) {
  const selectors = new Set<string>([
    normalizeRequestedClassification(requestedClassification),
  ]);

  if (timeline.classification) {
    const classification = getClassificationById(
      timeline.classification.classificationId,
    );

    if (classification) {
      for (const selector of listSupportedOntologyClassificationSelectors(
        classification,
      )) {
        selectors.add(selector);
      }
    }
  }

  for (const selector of selectors) {
    preloadedTimelines[selector] = timeline;
  }
}

export function loadPreloadedTimelineSelections(
  locale: SiteLocale,
): Record<string, OntologyTimelineResult> {
  const queue = [getDefaultTimelineClassificationSelector()];
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
  const defaultTimelineClassification =
    getDefaultTimelineClassificationSelector();
  const preloadedTimelines = loadPreloadedTimelineSelections(locale);
  const initialTimeline =
    preloadedTimelines[defaultTimelineClassification] ??
    loadOntologyTimelineData(defaultTimelineClassification, locale);

  return (
    <OntologyTimelineClientPage
      initialTimeline={initialTimeline}
      locale={locale}
      messages={messages}
      preloadedTimelines={preloadedTimelines}
    />
  );
}
