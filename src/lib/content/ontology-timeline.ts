import {
  buildPageReleaseMetadata,
  type ReleasablePageRecord,
} from "@/lib/content/page-release-metadata";
import {
  type DocsPageSource,
  loadPublishedDocsPagesSync,
  loadShippedLocalizedDocsPagesSync,
} from "@/lib/content/pages";
import { registryDisplayTitle } from "@/lib/content/registry-linking";
import {
  getPrimaryClassificationForRecord,
  getRegistryRecordById,
  listClassificationMembers,
  listClassificationRecords,
  listOntologyRelationshipsForRecord,
  listRelatedRegistryRecords,
  listSecondaryClassificationsForRecord,
} from "@/lib/content/registry-runtime";
import type { RelatedRegistryRecord } from "@/lib/content/related-docs";
import type {
  ClassificationRecord,
  OntologyRelationship,
} from "@/lib/content/schemas";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

type TimelineSourceRecord = ReleasablePageRecord;

export type OntologyTimelineMembership = {
  classificationId: string;
  classificationSlug: string;
  classificationTitle: string;
  membershipType: "primary" | "secondary";
};

export type OntologyTimelineRelationshipContext = {
  relationshipType: OntologyRelationship["relationshipType"];
  sourceId: string;
  sourceTitle: string;
  targetId: string;
  targetTitle?: string;
};

export type OntologyTimelineItem = {
  registryId: string;
  kind: TimelineSourceRecord["kind"];
  slug: string;
  title: string;
  summary: string;
  href?: string;
  dateValue: string;
  dateLabel: string;
  dateKind: "Released" | "Published";
  source?: {
    title: string;
    url: string;
  };
  classificationMemberships: OntologyTimelineMembership[];
  relationshipContext: OntologyTimelineRelationshipContext[];
};

export type OntologyTimelineClassificationSlice = {
  classificationId: string;
  slug: string;
  title: string;
  classificationType: ClassificationRecord["classificationType"];
  eventCount: number;
  active: boolean;
};

export type OntologyTimelineResult =
  | {
      status: "success";
      requestedClassification: string;
      classification: OntologyTimelineClassificationSlice;
      items: OntologyTimelineItem[];
      nearbyClassifications: OntologyTimelineClassificationSlice[];
    }
  | {
      status: "empty";
      reason: "unknown-classification" | "undated-classification";
      requestedClassification: string;
      classification?: OntologyTimelineClassificationSlice;
      items: [];
      nearbyClassifications: OntologyTimelineClassificationSlice[];
    };

export type BuildOntologyTimelineInput = {
  classification: string;
  pages: readonly DocsPageSource[];
  classifications: readonly ClassificationRecord[];
  records: readonly RelatedRegistryRecord[];
};

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase();
}

function classificationMatchScore(
  classification: ClassificationRecord,
  requestedClassification: string,
): number {
  const requested = normalizeLookupValue(requestedClassification);
  const id = normalizeLookupValue(classification.id);
  const idSuffix = id.replace(/^classification\./, "");
  const slug = normalizeLookupValue(classification.slug);
  const aliases = classification.aliases.map(normalizeLookupValue);
  const tags = classification.tags.map(normalizeLookupValue);

  if (id === requested || `classification.${requested}` === id) {
    return 100;
  }
  if (idSuffix === requested) {
    return 95;
  }
  if (slug === requested) {
    return 90;
  }
  if (slug.startsWith(`${requested}-`) || requested.startsWith(`${slug}-`)) {
    return 80;
  }
  if (aliases.includes(requested)) {
    return 70;
  }
  if (tags.includes(requested)) {
    return 60;
  }
  if (aliases.some((alias) => alias.includes(requested))) {
    return 50;
  }

  return 0;
}

function resolveClassification(
  classifications: readonly ClassificationRecord[],
  requestedClassification: string,
): ClassificationRecord | undefined {
  return classifications
    .map((classification) => ({
      classification,
      score: classificationMatchScore(classification, requestedClassification),
    }))
    .filter((match) => match.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.classification.id.localeCompare(right.classification.id),
    )[0]?.classification;
}

function pageByRegistryId(
  pages: readonly DocsPageSource[],
): Map<string, DocsPageSource> {
  return new Map(pages.map((page) => [page.frontmatter.registryId, page]));
}

function loadTimelineDocsPages(locale: SiteLocale): DocsPageSource[] {
  const defaultPages = loadPublishedDocsPagesSync(defaultLocale);
  if (locale === defaultLocale) {
    return defaultPages;
  }

  const localizedPagesByRegistryId = pageByRegistryId(
    loadShippedLocalizedDocsPagesSync(locale),
  );

  return defaultPages.map(
    (page) =>
      localizedPagesByRegistryId.get(page.frontmatter.registryId) ?? page,
  );
}

function isTimelineSourceRecord(
  record: RelatedRegistryRecord | undefined,
): record is TimelineSourceRecord {
  return (
    record?.kind === "concept" ||
    record?.kind === "model" ||
    record?.kind === "module" ||
    record?.kind === "paper" ||
    record?.kind === "system" ||
    record?.kind === "training-regime"
  );
}

function resolveRecordTitle(
  record: RelatedRegistryRecord | ClassificationRecord,
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): string {
  return (
    pagesByRegistryId.get(record.id)?.messages.title ??
    registryDisplayTitle(record)
  );
}

function resolveRecordSummary(
  record: RelatedRegistryRecord,
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): string {
  return (
    pagesByRegistryId.get(record.id)?.messages.description ??
    record.aliases[0] ??
    registryDisplayTitle(record)
  );
}

function toTimelineDateValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
  if (!match?.[1]) {
    return undefined;
  }

  return `${match[1]}-${match[2] ?? "01"}-${match[3] ?? "01"}`;
}

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatTimelineDateLabel(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) {
    return dateValue;
  }

  if (month === "01" && day === "01") {
    return year;
  }

  return `${monthLabels[Number(month) - 1] ?? month} ${year}`;
}

function classificationMembershipsForRecord(
  registryId: string,
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): OntologyTimelineMembership[] {
  const memberships: OntologyTimelineMembership[] = [];
  const primaryClassification = getPrimaryClassificationForRecord(registryId);

  if (primaryClassification) {
    memberships.push({
      classificationId: primaryClassification.id,
      classificationSlug: primaryClassification.slug,
      classificationTitle: resolveRecordTitle(
        primaryClassification,
        pagesByRegistryId,
      ),
      membershipType: "primary",
    });
  }

  for (const classification of listSecondaryClassificationsForRecord(
    registryId,
  )) {
    memberships.push({
      classificationId: classification.id,
      classificationSlug: classification.slug,
      classificationTitle: resolveRecordTitle(
        classification,
        pagesByRegistryId,
      ),
      membershipType: "secondary",
    });
  }

  return memberships;
}

function buildRelationshipContext(
  source: TimelineSourceRecord,
  relationship: ReturnType<typeof listOntologyRelationshipsForRecord>[number],
  target: TimelineSourceRecord,
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): OntologyTimelineRelationshipContext {
  return {
    relationshipType: relationship.relationshipType,
    sourceId: source.id,
    sourceTitle: resolveRecordTitle(source, pagesByRegistryId),
    targetId: relationship.targetId,
    targetTitle: resolveRecordTitle(target, pagesByRegistryId),
  };
}

function memberRecordsForClassification(
  classification: ClassificationRecord,
  recordsById: ReadonlyMap<string, RelatedRegistryRecord>,
): TimelineSourceRecord[] {
  return listClassificationMembers(classification.id).flatMap((member) => {
    const record = recordsById.get(member.record.id);
    return isTimelineSourceRecord(record) ? [record] : [];
  });
}

function collectCandidateRecords(
  classification: ClassificationRecord,
  recordsById: ReadonlyMap<string, RelatedRegistryRecord>,
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): Map<string, OntologyTimelineRelationshipContext[]> {
  const candidates = new Map<string, OntologyTimelineRelationshipContext[]>();
  const directMembers = memberRecordsForClassification(
    classification,
    recordsById,
  );
  const directMemberIds = new Set(directMembers.map((record) => record.id));

  for (const source of directMembers) {
    candidates.set(source.id, candidates.get(source.id) ?? []);

    for (const relationship of listOntologyRelationshipsForRecord(source.id)) {
      const relatedRecord = getRegistryRecordById(relationship.targetId);
      if (!isTimelineSourceRecord(relatedRecord)) {
        continue;
      }
      if (!directMemberIds.has(relatedRecord.id)) {
        continue;
      }

      const contexts = candidates.get(relatedRecord.id) ?? [];
      contexts.push(
        buildRelationshipContext(
          source,
          relationship,
          relatedRecord,
          pagesByRegistryId,
        ),
      );
      candidates.set(relatedRecord.id, contexts);
    }
  }

  return candidates;
}

function buildTimelineItemsForClassification(
  classification: ClassificationRecord,
  recordsById: ReadonlyMap<string, RelatedRegistryRecord>,
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): OntologyTimelineItem[] {
  const candidates = collectCandidateRecords(
    classification,
    recordsById,
    pagesByRegistryId,
  );

  return sortTimelineItems(
    [...candidates.entries()].flatMap(([registryId, relationshipContext]) => {
      const record = recordsById.get(registryId);
      if (!isTimelineSourceRecord(record)) {
        return [];
      }
      const item = toTimelineItem(
        record,
        relationshipContext,
        pagesByRegistryId,
      );
      return item ? [item] : [];
    }),
  );
}

function toClassificationSlice(
  classification: ClassificationRecord,
  eventCount: number,
  activeClassificationId: string,
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): OntologyTimelineClassificationSlice {
  return {
    classificationId: classification.id,
    slug: classification.slug,
    title: resolveRecordTitle(classification, pagesByRegistryId),
    classificationType: classification.classificationType,
    eventCount,
    active: classification.id === activeClassificationId,
  };
}

function isEligibleTimelineClassification(
  classification: ClassificationRecord,
): boolean {
  return classification.status === "published";
}

function buildNearbyClassificationSlices(
  items: readonly OntologyTimelineItem[],
  classifications: readonly ClassificationRecord[],
  activeClassification: ClassificationRecord,
  recordsById: ReadonlyMap<string, RelatedRegistryRecord>,
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): OntologyTimelineClassificationSlice[] {
  const nearbyClassificationIds = new Set<string>(
    classifications
      .filter(isEligibleTimelineClassification)
      .map((classification) => classification.id),
  );
  nearbyClassificationIds.add(activeClassification.id);

  for (const item of items) {
    for (const membership of item.classificationMemberships) {
      nearbyClassificationIds.add(membership.classificationId);
    }
  }

  for (const record of memberRecordsForClassification(
    activeClassification,
    recordsById,
  )) {
    for (const relationship of listOntologyRelationshipsForRecord(record.id)) {
      const relatedRecord = getRegistryRecordById(relationship.targetId);
      if (!isTimelineSourceRecord(relatedRecord)) {
        continue;
      }

      for (const membership of classificationMembershipsForRecord(
        relatedRecord.id,
        pagesByRegistryId,
      )) {
        nearbyClassificationIds.add(membership.classificationId);
      }
    }
  }

  const classificationsById = new Map(
    classifications.map((classification) => [
      classification.id,
      classification,
    ]),
  );

  return [...nearbyClassificationIds]
    .flatMap((classificationId) => {
      const classification = classificationsById.get(classificationId);
      return classification
        ? [
            toClassificationSlice(
              classification,
              buildTimelineItemsForClassification(
                classification,
                recordsById,
                pagesByRegistryId,
              ).length,
              activeClassification.id,
              pagesByRegistryId,
            ),
          ]
        : [];
    })
    .sort(
      (left, right) =>
        Number(right.active) - Number(left.active) ||
        right.eventCount - left.eventCount ||
        left.title.localeCompare(right.title) ||
        left.classificationId.localeCompare(right.classificationId),
    );
}

function toTimelineItem(
  record: TimelineSourceRecord,
  relationshipContext: OntologyTimelineRelationshipContext[],
  pagesByRegistryId: ReadonlyMap<string, DocsPageSource>,
): OntologyTimelineItem | undefined {
  const metadata = buildPageReleaseMetadata(record);
  const dateValue = toTimelineDateValue(metadata?.releaseDate);
  if (!metadata || !dateValue) {
    return undefined;
  }

  const page = pagesByRegistryId.get(record.id);

  return {
    registryId: record.id,
    kind: record.kind,
    slug: record.slug,
    title: resolveRecordTitle(record, pagesByRegistryId),
    summary: resolveRecordSummary(record, pagesByRegistryId),
    href: page?.url,
    dateValue,
    dateLabel: formatTimelineDateLabel(dateValue),
    dateKind: metadata.dateLabel,
    source: metadata.source,
    classificationMemberships: classificationMembershipsForRecord(
      record.id,
      pagesByRegistryId,
    ),
    relationshipContext,
  };
}

function sortTimelineItems(
  items: readonly OntologyTimelineItem[],
): OntologyTimelineItem[] {
  return [...items].sort(
    (left, right) =>
      left.dateValue.localeCompare(right.dateValue) ||
      left.title.localeCompare(right.title) ||
      left.registryId.localeCompare(right.registryId),
  );
}

export function buildOntologyTimelineDataFromSources(
  input: BuildOntologyTimelineInput,
): OntologyTimelineResult {
  const pagesById = pageByRegistryId(input.pages);
  const classification = resolveClassification(
    input.classifications,
    input.classification,
  );

  if (!classification) {
    return {
      status: "empty",
      reason: "unknown-classification",
      requestedClassification: input.classification,
      items: [],
      nearbyClassifications: [],
    };
  }

  const recordsById = new Map(
    input.records.map((record) => [record.id, record]),
  );
  const items = buildTimelineItemsForClassification(
    classification,
    recordsById,
    pagesById,
  );
  const nearbyClassifications = buildNearbyClassificationSlices(
    items,
    input.classifications,
    classification,
    recordsById,
    pagesById,
  );
  const classificationSlice = toClassificationSlice(
    classification,
    items.length,
    classification.id,
    pagesById,
  );

  if (items.length === 0) {
    return {
      status: "empty",
      reason: "undated-classification",
      requestedClassification: input.classification,
      classification: classificationSlice,
      items: [],
      nearbyClassifications,
    };
  }

  return {
    status: "success",
    requestedClassification: input.classification,
    classification: classificationSlice,
    items,
    nearbyClassifications,
  };
}

export function loadOntologyTimelineData(
  classification: string,
  locale: SiteLocale = defaultLocale,
): OntologyTimelineResult {
  return buildOntologyTimelineDataFromSources({
    classification,
    pages: loadTimelineDocsPages(locale),
    classifications: listClassificationRecords(),
    records: listRelatedRegistryRecords(),
  });
}
