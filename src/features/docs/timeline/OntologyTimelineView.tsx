import Link from "next/link";
import { OntologyChronoTimeline } from "@/features/docs/timeline/OntologyChronoTimeline";
import { TimelineClassificationChips } from "@/features/docs/timeline/TimelineClassificationChips";
import type {
  OntologyTimelineClassificationSlice,
  OntologyTimelineResult,
} from "@/lib/content/ontology-timeline";
import type { UiMessages } from "@/lib/content/ui-messages";
import {
  buildLocalizedRoute,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

type OntologyTimelineViewProps = {
  locale: SiteLocale;
  messages: UiMessages;
  timeline: OntologyTimelineResult;
  onSelectClassification?: (classification: string) => void;
};

function timelineClassificationHref(locale: SiteLocale): string {
  return buildLocalizedRoute(
    { surface: "docs-page", slug: "timeline" },
    locale,
  );
}

function buildTimelineChips(
  timeline: OntologyTimelineResult,
): OntologyTimelineClassificationSlice[] {
  if (timeline.nearbyClassifications.length > 0) {
    return timeline.nearbyClassifications;
  }

  if (timeline.classification) {
    return [timeline.classification];
  }

  return [
    {
      classificationId: "classification.activation-functions",
      slug: "activation",
      title: "activation function",
      classificationType: "family",
      eventCount: 0,
      active: false,
    },
  ];
}

function renderEmptyTimeline(
  timeline: Extract<OntologyTimelineResult, { status: "empty" }>,
  messages: UiMessages,
  locale: SiteLocale,
  onSelectClassification?: (classification: string) => void,
) {
  const { timelinePage } = messages;
  const basePath = timelineClassificationHref(locale);
  const classificationLabel =
    timeline.classification?.title ?? timeline.requestedClassification;

  return (
    <div
      aria-live="polite"
      className="mt-8 block rounded-lg border border-border bg-card/40 p-5"
      role="status"
    >
      <h2 className="mt-0 text-xl text-foreground">
        {timelinePage.emptyTitle}
      </h2>
      <p className="mb-0 text-sm text-muted-foreground">
        {timelinePage.emptyDescription.replace(
          "{classification}",
          classificationLabel,
        )}
      </p>
      <TimelineClassificationChips
        basePath={basePath}
        chips={buildTimelineChips(timeline)}
        labels={{
          navigation: timelinePage.selectorLabel,
          eventCount: timelinePage.eventCountLabel,
        }}
        onSelectClassification={onSelectClassification}
      />
      <Link
        className="mt-4 inline-flex rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground no-underline transition-colors hover:bg-muted hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={`${basePath}?classification=activation`}
        onClick={() => onSelectClassification?.("activation")}
      >
        {timelinePage.activationLink}
      </Link>
    </div>
  );
}

export function OntologyTimelineView({
  locale,
  messages,
  timeline,
  onSelectClassification,
}: OntologyTimelineViewProps) {
  const { timelinePage } = messages;
  const basePath = timelineClassificationHref(locale);

  return (
    <div className="not-prose">
      <p className="text-sm font-medium uppercase tracking-normal text-primary">
        {timelinePage.eyebrow}
      </p>
      <TimelineClassificationChips
        basePath={basePath}
        chips={buildTimelineChips(timeline)}
        labels={{
          navigation: timelinePage.selectorLabel,
          eventCount: timelinePage.eventCountLabel,
        }}
        onSelectClassification={onSelectClassification}
      />
      {timeline.status === "success" ? (
        <div className="mt-8">
          <OntologyChronoTimeline
            items={timeline.items}
            labels={{
              docsLink: timelinePage.docsLink,
              regionLabel: timelinePage.regionLabel,
              sourcePrefix: timelinePage.sourcePrefix,
              loadingTitle: timelinePage.loadingTitle,
              loadingDescription: timelinePage.loadingDescription,
              errorTitle: timelinePage.errorTitle,
              errorDescription: timelinePage.errorDescription,
            }}
          />
        </div>
      ) : (
        renderEmptyTimeline(timeline, messages, locale, onSelectClassification)
      )}
    </div>
  );
}
