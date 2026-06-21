import type { PublishedDocsRegistryIds } from "@/lib/content/published-docs-registry-ids";
import {
  hasPublishedDocsPageForRecord,
  registryDisplayTitle,
  registryRecordHref,
} from "@/lib/content/registry-linking";
import type {
  ConceptRecord,
  DatasetRecord,
  ModelRecord,
  ModuleRecord,
  OrganizationRecord,
  PageMessages,
  PaperRecord,
  SystemRecord,
  TrainingRegimeRecord,
} from "@/lib/content/schemas";

export const SAME_VARIANT_GROUP = "same-variant-group" as const;
export const SHARED_TAGS = "shared-tags" as const;
export const SAME_CONCEPT_TYPE = "same-concept-type" as const;
export const CURATED_RELATED = "curated-related" as const;
export const SAME_MODEL_FAMILY = "same-model-family" as const;
export const SHARED_MODULES = "shared-modules" as const;
export const SHARED_TRAINING_REGIMES = "shared-training-regimes" as const;
export const INTRODUCED_RECORDS = "introduced-records" as const;
export { registryDisplayTitle };

export type DerivedRelatedDocGroupId =
  | typeof SAME_VARIANT_GROUP
  | typeof SHARED_TAGS
  | typeof SAME_CONCEPT_TYPE
  | typeof CURATED_RELATED
  | typeof SAME_MODEL_FAMILY
  | typeof SHARED_MODULES
  | typeof SHARED_TRAINING_REGIMES
  | typeof INTRODUCED_RECORDS;

export const DERIVED_RELATED_DOC_GROUP_LABELS: Record<
  DerivedRelatedDocGroupId,
  string
> = {
  [SAME_VARIANT_GROUP]: "Same variant group",
  [SHARED_TAGS]: "Shared tag",
  [SAME_CONCEPT_TYPE]: "Same concept type",
  [CURATED_RELATED]: "curated",
  [SAME_MODEL_FAMILY]: "Same model family",
  [SHARED_MODULES]: "Shared modules",
  [SHARED_TRAINING_REGIMES]: "Shared training regimes",
  [INTRODUCED_RECORDS]: "Introduced by this paper",
};

export const PLANNED_RELATED_REASON_LABEL = "Planned related doc" as const;

export type RelatedRegistryRecord =
  | ModuleRecord
  | ConceptRecord
  | ModelRecord
  | PaperRecord
  | TrainingRegimeRecord
  | SystemRecord
  | DatasetRecord
  | OrganizationRecord;

export type RelatedDocItem = {
  registryId: string;
  slug: string;
  title: string;
  /** Omitted when the target is planned (draft without a published docs page). */
  href?: string;
  reasonLabel: string;
  isPlanned: boolean;
};

export type RelatedDocGroup = {
  id: DerivedRelatedDocGroupId;
  reasonLabel: string;
  items: RelatedDocItem[];
};

const RELATED_DOC_GROUP_PRIORITY: readonly DerivedRelatedDocGroupId[] = [
  CURATED_RELATED,
  INTRODUCED_RECORDS,
  SAME_MODEL_FAMILY,
  SHARED_MODULES,
  SHARED_TRAINING_REGIMES,
  SAME_VARIANT_GROUP,
  SAME_CONCEPT_TYPE,
  SHARED_TAGS,
];

function relatedDocDedupKey(item: RelatedDocItem): string {
  return item.href ?? `planned:${item.registryId}`;
}

function dedupeRelatedDocItems(items: RelatedDocItem[]): RelatedDocItem[] {
  const seen = new Set<string>();
  const deduped: RelatedDocItem[] = [];

  for (const item of items) {
    const dedupKey = relatedDocDedupKey(item);
    if (seen.has(dedupKey)) {
      continue;
    }
    seen.add(dedupKey);
    deduped.push(item);
  }

  return deduped;
}

function getConceptType(record: RelatedRegistryRecord): string | undefined {
  if (record.kind === "concept") {
    return record.conceptType;
  }
  if (record.kind === "module") {
    return record.conceptType;
  }
  return undefined;
}

function sharesTag(sourceTags: string[], candidateTags: string[]): boolean {
  return sourceTags.some((tag) => candidateTags.includes(tag));
}

/** True when the registry record has a published docs page readers can open. */
export function hasPublishedDocsPage(
  record: RelatedRegistryRecord,
  publishedRegistryIds: PublishedDocsRegistryIds,
): boolean {
  return hasPublishedDocsPageForRecord(record, publishedRegistryIds);
}

/** Draft (or otherwise unpublished-page) targets surface as planned rows without href. */
export function isPlannedRelatedTarget(
  record: RelatedRegistryRecord,
  publishedRegistryIds: PublishedDocsRegistryIds,
): boolean {
  return (
    record.status === "draft" &&
    !hasPublishedDocsPage(record, publishedRegistryIds)
  );
}

function toRelatedItem(
  record: RelatedRegistryRecord,
  reasonLabel: string,
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem {
  const isPlanned = isPlannedRelatedTarget(record, publishedRegistryIds);
  const hasDocsPage = hasPublishedDocsPage(record, publishedRegistryIds);
  return {
    registryId: record.id,
    slug: record.slug,
    title: registryDisplayTitle(record),
    href: isPlanned || !hasDocsPage ? undefined : registryRecordHref(record),
    reasonLabel: isPlanned ? PLANNED_RELATED_REASON_LABEL : reasonLabel,
    isPlanned,
  };
}

/** Published peers sharing `variantGroup` with the source module, excluding the source. */
export function deriveSameVariantGroupPeers(
  source: ModuleRecord,
  modules: ModuleRecord[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem[] {
  if (!source.variantGroup) {
    return [];
  }

  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SAME_VARIANT_GROUP];
  return dedupeRelatedDocItems(
    modules
      .filter(
        (candidate) =>
          candidate.id !== source.id &&
          candidate.variantGroup === source.variantGroup &&
          hasPublishedDocsPage(candidate, publishedRegistryIds),
      )
      .map((record) => toRelatedItem(record, reasonLabel, publishedRegistryIds))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}

/** Peers sharing at least one tag with the source record, excluding the source. */
export function deriveSharedTagPeers(
  source: RelatedRegistryRecord,
  candidates: RelatedRegistryRecord[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem[] {
  if (source.tags.length === 0) {
    return [];
  }

  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SHARED_TAGS];
  return dedupeRelatedDocItems(
    candidates
      .filter(
        (candidate) =>
          candidate.id !== source.id && sharesTag(source.tags, candidate.tags),
      )
      .map((record) => toRelatedItem(record, reasonLabel, publishedRegistryIds))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}

/** Peers with the same `conceptType`, excluding the source. */
export function deriveSameConceptTypePeers(
  source: RelatedRegistryRecord,
  candidates: RelatedRegistryRecord[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem[] {
  const sourceConceptType = getConceptType(source);
  if (!sourceConceptType) {
    return [];
  }

  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SAME_CONCEPT_TYPE];
  return dedupeRelatedDocItems(
    candidates
      .filter(
        (candidate) =>
          candidate.id !== source.id &&
          getConceptType(candidate) === sourceConceptType,
      )
      .map((record) => toRelatedItem(record, reasonLabel, publishedRegistryIds))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}

export function deriveSameModelFamilyPeers(
  source: ModelRecord,
  candidates: ModelRecord[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem[] {
  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SAME_MODEL_FAMILY];
  return dedupeRelatedDocItems(
    candidates
      .filter(
        (candidate) =>
          candidate.id !== source.id && candidate.family === source.family,
      )
      .map((record) => toRelatedItem(record, reasonLabel, publishedRegistryIds))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}

function sharesAnyId(source: string[], candidate: string[]): boolean {
  return source.some((id) => candidate.includes(id));
}

export function deriveSharedModulePeers(
  source: ModelRecord,
  candidates: ModelRecord[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem[] {
  if (source.moduleIds.length === 0) {
    return [];
  }

  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SHARED_MODULES];
  return dedupeRelatedDocItems(
    candidates
      .filter(
        (candidate) =>
          candidate.id !== source.id &&
          sharesAnyId(source.moduleIds, candidate.moduleIds),
      )
      .map((record) => toRelatedItem(record, reasonLabel, publishedRegistryIds))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}

export function deriveSharedTrainingRegimePeers(
  source: ModelRecord,
  candidates: ModelRecord[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem[] {
  if (source.trainingRegimeIds.length === 0) {
    return [];
  }

  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SHARED_TRAINING_REGIMES];
  return dedupeRelatedDocItems(
    candidates
      .filter(
        (candidate) =>
          candidate.id !== source.id &&
          sharesAnyId(source.trainingRegimeIds, candidate.trainingRegimeIds),
      )
      .map((record) => toRelatedItem(record, reasonLabel, publishedRegistryIds))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}

export function deriveIntroducedRecordItems(
  source: PaperRecord,
  candidates: RelatedRegistryRecord[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem[] {
  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[INTRODUCED_RECORDS];
  const ids = [
    ...source.introducesIds,
    ...source.modelIds,
    ...source.moduleIds,
    ...source.conceptIds,
  ];
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );

  return dedupeRelatedDocItems(
    ids
      .map((id) => candidatesById.get(id))
      .filter(
        (record): record is RelatedRegistryRecord =>
          record !== undefined && record.id !== source.id,
      )
      .map((record) =>
        toRelatedItem(record, reasonLabel, publishedRegistryIds),
      ),
  );
}

/** Applies page-message overrides for curated related-doc relationship labels. */
export function applyRelatedDocMessageOverrides(
  items: RelatedDocItem[],
  messages?: Pick<PageMessages, "relatedDocs">,
): RelatedDocItem[] {
  const overrides = messages?.relatedDocs;
  if (!overrides) {
    return items;
  }

  return items.map((item) => {
    const override = overrides[item.registryId];
    if (!override || item.isPlanned) {
      return item;
    }

    return {
      ...item,
      reasonLabel: override.reason,
    };
  });
}

/** Removes duplicate related items while preserving the original item order. */
export function excludeRelatedDocItems(
  items: RelatedDocItem[],
  excludedRegistryIds: Iterable<string>,
): RelatedDocItem[] {
  const excluded = new Set(excludedRegistryIds);
  if (excluded.size === 0) {
    return items;
  }

  return items.filter((item) => !excluded.has(item.registryId));
}

/** Curated `relatedIds` on the source record, preserving registry order. */
export function deriveCuratedRelatedItems(
  source: RelatedRegistryRecord,
  candidates: RelatedRegistryRecord[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocItem[] {
  if (source.relatedIds.length === 0) {
    return [];
  }

  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );
  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED];

  return dedupeRelatedDocItems(
    source.relatedIds
      .map((id) => candidatesById.get(id))
      .filter(
        (record): record is RelatedRegistryRecord =>
          record !== undefined && record.id !== source.id,
      )
      .map((record) =>
        toRelatedItem(record, reasonLabel, publishedRegistryIds),
      ),
  );
}

export function deriveRelatedDocGroups(
  source: RelatedRegistryRecord,
  candidates: RelatedRegistryRecord[],
  requestedGroups: string[],
  publishedRegistryIds: PublishedDocsRegistryIds,
): RelatedDocGroup[] {
  const groupsById = new Map<DerivedRelatedDocGroupId, RelatedDocGroup>();

  if (
    requestedGroups.includes(SAME_VARIANT_GROUP) &&
    source.kind === "module"
  ) {
    const moduleCandidates = candidates.filter(
      (candidate): candidate is ModuleRecord => candidate.kind === "module",
    );
    const items = deriveSameVariantGroupPeers(
      source,
      moduleCandidates,
      publishedRegistryIds,
    );
    if (items.length > 0) {
      groupsById.set(SAME_VARIANT_GROUP, {
        id: SAME_VARIANT_GROUP,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SAME_VARIANT_GROUP],
        items,
      });
    }
  }

  if (requestedGroups.includes(SAME_MODEL_FAMILY) && source.kind === "model") {
    const modelCandidates = candidates.filter(
      (candidate): candidate is ModelRecord => candidate.kind === "model",
    );
    const items = deriveSameModelFamilyPeers(
      source,
      modelCandidates,
      publishedRegistryIds,
    );
    if (items.length > 0) {
      groupsById.set(SAME_MODEL_FAMILY, {
        id: SAME_MODEL_FAMILY,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SAME_MODEL_FAMILY],
        items,
      });
    }
  }

  if (requestedGroups.includes(SHARED_MODULES) && source.kind === "model") {
    const modelCandidates = candidates.filter(
      (candidate): candidate is ModelRecord => candidate.kind === "model",
    );
    const items = deriveSharedModulePeers(
      source,
      modelCandidates,
      publishedRegistryIds,
    );
    if (items.length > 0) {
      groupsById.set(SHARED_MODULES, {
        id: SHARED_MODULES,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SHARED_MODULES],
        items,
      });
    }
  }

  if (
    requestedGroups.includes(SHARED_TRAINING_REGIMES) &&
    source.kind === "model"
  ) {
    const modelCandidates = candidates.filter(
      (candidate): candidate is ModelRecord => candidate.kind === "model",
    );
    const items = deriveSharedTrainingRegimePeers(
      source,
      modelCandidates,
      publishedRegistryIds,
    );
    if (items.length > 0) {
      groupsById.set(SHARED_TRAINING_REGIMES, {
        id: SHARED_TRAINING_REGIMES,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SHARED_TRAINING_REGIMES],
        items,
      });
    }
  }

  if (requestedGroups.includes(INTRODUCED_RECORDS) && source.kind === "paper") {
    const items = deriveIntroducedRecordItems(
      source,
      candidates,
      publishedRegistryIds,
    );
    if (items.length > 0) {
      groupsById.set(INTRODUCED_RECORDS, {
        id: INTRODUCED_RECORDS,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[INTRODUCED_RECORDS],
        items,
      });
    }
  }

  if (requestedGroups.includes(SHARED_TAGS)) {
    const items = deriveSharedTagPeers(
      source,
      candidates,
      publishedRegistryIds,
    );
    if (items.length > 0) {
      groupsById.set(SHARED_TAGS, {
        id: SHARED_TAGS,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SHARED_TAGS],
        items,
      });
    }
  }

  if (requestedGroups.includes(SAME_CONCEPT_TYPE)) {
    const items = deriveSameConceptTypePeers(
      source,
      candidates,
      publishedRegistryIds,
    );
    if (items.length > 0) {
      groupsById.set(SAME_CONCEPT_TYPE, {
        id: SAME_CONCEPT_TYPE,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SAME_CONCEPT_TYPE],
        items,
      });
    }
  }

  if (requestedGroups.includes(CURATED_RELATED)) {
    const items = deriveCuratedRelatedItems(
      source,
      candidates,
      publishedRegistryIds,
    );
    if (items.length > 0) {
      groupsById.set(CURATED_RELATED, {
        id: CURATED_RELATED,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED],
        items,
      });
    }
  }

  const orderedGroupIds = requestedGroups.filter(
    (groupId): groupId is DerivedRelatedDocGroupId =>
      groupId === SAME_VARIANT_GROUP ||
      groupId === SHARED_TAGS ||
      groupId === SAME_CONCEPT_TYPE ||
      groupId === CURATED_RELATED,
  );
  const filteredGroupsById = new Map<
    DerivedRelatedDocGroupId,
    RelatedDocGroup
  >();
  const seenKeys = new Set<string>();

  for (const groupId of RELATED_DOC_GROUP_PRIORITY) {
    const group = groupsById.get(groupId);
    if (!group) {
      continue;
    }

    const items = group.items.filter((item) => {
      const dedupKey = relatedDocDedupKey(item);
      if (seenKeys.has(dedupKey)) {
        return false;
      }
      seenKeys.add(dedupKey);
      return true;
    });

    if (items.length === 0) {
      continue;
    }

    filteredGroupsById.set(groupId, {
      ...group,
      items,
    });
  }

  return RELATED_DOC_GROUP_PRIORITY.filter((groupId) =>
    orderedGroupIds.includes(groupId),
  )
    .map((groupId) => filteredGroupsById.get(groupId) ?? null)
    .filter((group): group is RelatedDocGroup => group !== null);
}
