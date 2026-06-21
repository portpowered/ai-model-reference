import { getPublishedDocsHrefForRecord } from "@/lib/content/published-docs-registry-ids";
import {
  type ClassificationMember,
  listClassificationMembers,
  listClassificationRecords,
} from "@/lib/content/registry-runtime";
import type { ClassificationRecord } from "@/lib/content/schemas";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

export const TOPOLOGY_SEED_PARENT_CLASSIFICATION_ID =
  "classification.neural-network-components";

export const TOPOLOGY_SURFACE_MODES = ["graph-map", "timeline"] as const;

export type TopologySurfaceMode = (typeof TOPOLOGY_SURFACE_MODES)[number];

export type TopologyNavigationDestination = {
  mode: TopologySurfaceMode;
  label: string;
  href: string;
};

export type TopologyNavigationOption = {
  classificationId: string;
  classificationSlug: string;
  label: string;
  memberCount: number;
  destinations: TopologyNavigationDestination[];
};

const TOPOLOGY_SEED_CLASSIFICATION_KEYS = {
  "activation-functions": "activationFunctions",
  "feed-forward-networks": "feedForwardNetworks",
} as const;

type TopologySeedClassificationSlug =
  keyof typeof TOPOLOGY_SEED_CLASSIFICATION_KEYS;

export type TopologyNavigationLabels = {
  classificationLabels?: Partial<
    Record<TopologySeedClassificationSlug, string>
  >;
  surfaceLabels?: Partial<Record<TopologySurfaceMode, string>>;
};

type TopologyNavigationInput = {
  locale?: SiteLocale;
  classifications?: readonly ClassificationRecord[];
  listMembers?: (classificationId: string) => readonly ClassificationMember[];
  labels?: TopologyNavigationLabels;
};

const topologySurfaceLabels: Record<TopologySurfaceMode, string> = {
  "graph-map": "Graph map",
  timeline: "Timeline",
};

export function getTopologyNavigationLabels(
  messages: UiMessages,
): TopologyNavigationLabels {
  return {
    classificationLabels: {
      "activation-functions":
        messages.topologyBrowse.classificationLabels.activationFunctions,
      "feed-forward-networks":
        messages.topologyBrowse.classificationLabels.feedForwardNetworks,
    },
    surfaceLabels: {
      "graph-map": messages.topologyBrowse.graphMapLabel,
      timeline: messages.topologyBrowse.timelineLabel,
    },
  };
}

function formatClassificationLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getClassificationLabel(
  slug: string,
  labels?: TopologyNavigationLabels,
): string {
  return (
    labels?.classificationLabels?.[slug as TopologySeedClassificationSlug] ??
    formatClassificationLabel(slug)
  );
}

function isEligibleSeedClassification(record: ClassificationRecord): boolean {
  return (
    record.status === "published" &&
    record.parentClassificationId === TOPOLOGY_SEED_PARENT_CLASSIFICATION_ID &&
    record.classifiesKinds.some(
      (kind) => kind === "concept" || kind === "module",
    )
  );
}

function listPublishedDocsBackedMembers(
  members: readonly ClassificationMember[],
): ClassificationMember[] {
  return members.filter(
    (member) =>
      member.record.status === "published" &&
      getPublishedDocsHrefForRecord(member.record) !== null,
  );
}

export function buildTopologyDestinationHref(
  classificationSlug: string,
  mode: TopologySurfaceMode,
  locale: SiteLocale,
): string {
  const params = new URLSearchParams([
    ["classification", classificationSlug],
    ["mode", mode],
  ]);

  return `${buildLocalizedRoute({ surface: "browse" }, locale)}?${params.toString()}`;
}

function buildDestinations(
  classificationSlug: string,
  locale: SiteLocale,
  labels?: TopologyNavigationLabels,
): TopologyNavigationDestination[] {
  return TOPOLOGY_SURFACE_MODES.map((mode) => ({
    mode,
    label: labels?.surfaceLabels?.[mode] ?? topologySurfaceLabels[mode],
    href: buildTopologyDestinationHref(classificationSlug, mode, locale),
  }));
}

export function listTopologyNavigationOptions({
  locale = defaultLocale,
  classifications = listClassificationRecords(),
  listMembers = listClassificationMembers,
  labels,
}: TopologyNavigationInput = {}): TopologyNavigationOption[] {
  return classifications.flatMap((classification) => {
    if (!isEligibleSeedClassification(classification)) {
      return [];
    }

    const publishedMembers = listPublishedDocsBackedMembers(
      listMembers(classification.id),
    );
    if (publishedMembers.length === 0) {
      return [];
    }

    return [
      {
        classificationId: classification.id,
        classificationSlug: classification.slug,
        label: getClassificationLabel(classification.slug, labels),
        memberCount: publishedMembers.length,
        destinations: buildDestinations(classification.slug, locale, labels),
      },
    ];
  });
}
