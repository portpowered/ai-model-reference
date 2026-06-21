import { getPublishedDocsHrefForRecord } from "@/lib/content/published-docs-registry-ids";
import {
  buildClassificationSubtree,
  type ClassificationSubtreeClassificationNode,
} from "@/lib/content/registry-runtime";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

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
  tree: ClassificationSubtreeClassificationNode;
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
  tree?: readonly ClassificationSubtreeClassificationNode[];
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

export function getTopologyClassificationLabel(
  slug: string,
  labels?: TopologyNavigationLabels,
): string {
  return (
    labels?.classificationLabels?.[slug as TopologySeedClassificationSlug] ??
    formatClassificationLabel(slug)
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
  tree = buildClassificationSubtree({
    classificationTraversal: {
      classifiesKinds: ["module"],
      statuses: ["published"],
    },
    memberKinds: ["module"],
  }).roots,
  labels,
}: TopologyNavigationInput = {}): TopologyNavigationOption[] {
  return tree
    .flatMap((rootClassification) => rootClassification.classificationChildren)
    .filter(
      (classification) =>
        classification.totalMemberCount > 0 &&
        classification.recordChildren.every(
          (recordNode) =>
            recordNode.member.record.status === "published" &&
            getPublishedDocsHrefForRecord(recordNode.member.record) !== null,
        ),
    )
    .map((classification) => ({
      classificationId: classification.classification.id,
      classificationSlug: classification.classification.slug,
      label: getTopologyClassificationLabel(
        classification.classification.slug,
        labels,
      ),
      memberCount: classification.totalMemberCount,
      tree: classification,
      destinations: buildDestinations(
        classification.classification.slug,
        locale,
        labels,
      ),
    }));
}
