import { localizeDocsHref } from "@/lib/content/localized-docs-href";
import {
  getPublishedDocsHrefForRecord,
  type PublishedDocsRecordRef,
} from "@/lib/content/published-docs-registry-ids";
import type {
  ClassificationTreeClassificationNode,
  ClassificationTreeNode,
} from "@/lib/content/registry-runtime";
import {
  getTopologyClassificationLabel,
  type TopologyNavigationLabels,
} from "@/lib/content/topology-navigation";
import type { SiteLocale } from "@/lib/i18n/locale-routing";

export type TopologyMemberEntry = {
  registryId: string;
  slug: string;
  title: string;
  summary: string;
  url: string;
  kind: string;
  membershipType: "primary" | "secondary";
};

export type TopologyClassificationEntry = {
  nodeType: "classification";
  classificationId: string;
  slug: string;
  title: string;
  directMemberCount: number;
  totalMemberCount: number;
  children: TopologyTreeEntry[];
};

export type TopologyTreeEntry =
  | TopologyClassificationEntry
  | (TopologyMemberEntry & { nodeType: "record" });

type DocsPageEntry = {
  docsSlug: string;
  frontmatter: {
    registryId: string;
  };
  messages: {
    title: string;
    description: string;
  };
};

type BuildTopologyTreeEntriesInput = {
  tree: ClassificationTreeClassificationNode;
  localizedPages: readonly DocsPageEntry[];
  canonicalPages: readonly DocsPageEntry[];
  locale: SiteLocale;
  topologyLabels: TopologyNavigationLabels;
};

function formatFallbackRegistryTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildPublishedRecordEntry(
  record: PublishedDocsRecordRef & { status?: string },
  membershipType: "primary" | "secondary",
  localizedPagesByRegistryId: ReadonlyMap<string, DocsPageEntry>,
  canonicalPagesByRegistryId: ReadonlyMap<string, DocsPageEntry>,
  locale: SiteLocale,
): TopologyTreeEntry | null {
  const docsHref = getPublishedDocsHrefForRecord(record);
  if (
    (record.status !== undefined && record.status !== "published") ||
    docsHref === null
  ) {
    return null;
  }

  const page =
    localizedPagesByRegistryId.get(record.id) ??
    canonicalPagesByRegistryId.get(record.id);
  const title =
    page?.messages.title ?? formatFallbackRegistryTitle(record.slug);
  const summary = page?.messages.description ?? title;

  return {
    nodeType: "record",
    registryId: record.id,
    slug: page?.docsSlug ?? record.slug,
    title,
    summary,
    url: localizeDocsHref(docsHref, locale),
    kind: record.kind,
    membershipType,
  };
}

function buildTopologyTreeEntry(
  node: ClassificationTreeNode,
  localizedPagesByRegistryId: ReadonlyMap<string, DocsPageEntry>,
  canonicalPagesByRegistryId: ReadonlyMap<string, DocsPageEntry>,
  locale: SiteLocale,
  topologyLabels: TopologyNavigationLabels,
): TopologyTreeEntry | null {
  if (node.nodeType === "record") {
    return buildPublishedRecordEntry(
      node.member.record,
      node.member.membershipType,
      localizedPagesByRegistryId,
      canonicalPagesByRegistryId,
      locale,
    );
  }

  const children = node.children
    .map((child) =>
      buildTopologyTreeEntry(
        child,
        localizedPagesByRegistryId,
        canonicalPagesByRegistryId,
        locale,
        topologyLabels,
      ),
    )
    .flatMap((entry) => (entry ? [entry] : []));

  return {
    nodeType: "classification",
    classificationId: node.classification.id,
    slug: node.classification.slug,
    title: getTopologyClassificationLabel(
      node.classification.slug,
      topologyLabels,
    ),
    directMemberCount: children.filter((child) => child.nodeType === "record")
      .length,
    totalMemberCount: children.reduce(
      (count, child) =>
        count + (child.nodeType === "record" ? 1 : child.totalMemberCount),
      0,
    ),
    children,
  };
}

export function buildTopologyTreeEntries({
  tree,
  localizedPages,
  canonicalPages,
  locale,
  topologyLabels,
}: BuildTopologyTreeEntriesInput): TopologyClassificationEntry[] {
  const localizedPagesByRegistryId = new Map(
    localizedPages.map((page) => [page.frontmatter.registryId, page]),
  );
  const canonicalPagesByRegistryId = new Map(
    canonicalPages.map((page) => [page.frontmatter.registryId, page]),
  );
  const entry = buildTopologyTreeEntry(
    tree,
    localizedPagesByRegistryId,
    canonicalPagesByRegistryId,
    locale,
    topologyLabels,
  );

  return entry && entry.nodeType === "classification" ? [entry] : [];
}
