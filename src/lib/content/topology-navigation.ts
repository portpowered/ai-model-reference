import { getPublishedDocsHrefForRecord } from "@/lib/content/published-docs-registry-ids";
import {
  type ClassificationMember,
  listClassificationMembers,
  listClassificationRecords,
} from "@/lib/content/registry-runtime";
import type { ClassificationRecord } from "@/lib/content/schemas";
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

type TopologyNavigationInput = {
  locale?: SiteLocale;
  classifications?: readonly ClassificationRecord[];
  listMembers?: (classificationId: string) => readonly ClassificationMember[];
};

const topologySurfaceLabels: Record<TopologySurfaceMode, string> = {
  "graph-map": "Graph map",
  timeline: "Timeline",
};

function formatClassificationLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function topologyDestinationHref(
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
): TopologyNavigationDestination[] {
  return TOPOLOGY_SURFACE_MODES.map((mode) => ({
    mode,
    label: topologySurfaceLabels[mode],
    href: topologyDestinationHref(classificationSlug, mode, locale),
  }));
}

export function listTopologyNavigationOptions({
  locale = defaultLocale,
  classifications = listClassificationRecords(),
  listMembers = listClassificationMembers,
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
        label: formatClassificationLabel(classification.slug),
        memberCount: publishedMembers.length,
        destinations: buildDestinations(classification.slug, locale),
      },
    ];
  });
}
