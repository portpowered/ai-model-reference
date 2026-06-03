import { glossaryPageHref, modulePageHref } from "@/lib/content/content-hrefs";
import type { ConceptRecord, ModuleRecord } from "@/lib/content/schemas";

export { glossaryPageHref, modulePageHref } from "@/lib/content/content-hrefs";

export const SAME_VARIANT_GROUP = "same-variant-group" as const;
export const SHARED_TAGS = "shared-tags" as const;
export const SAME_CONCEPT_TYPE = "same-concept-type" as const;

export type DerivedRelatedDocGroupId =
  | typeof SAME_VARIANT_GROUP
  | typeof SHARED_TAGS
  | typeof SAME_CONCEPT_TYPE;

export const DERIVED_RELATED_DOC_GROUP_LABELS: Record<
  DerivedRelatedDocGroupId,
  string
> = {
  [SAME_VARIANT_GROUP]: "Same variant group",
  [SHARED_TAGS]: "Shared tag",
  [SAME_CONCEPT_TYPE]: "Same concept type",
};

export type RelatedRegistryRecord = ModuleRecord | ConceptRecord;

export type RelatedDocItem = {
  registryId: string;
  slug: string;
  title: string;
  href: string;
  reasonLabel: string;
};

export type RelatedDocGroup = {
  id: DerivedRelatedDocGroupId;
  reasonLabel: string;
  items: RelatedDocItem[];
};

function formatSlugLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Reader-facing title from registry aliases or slug. */
export function registryDisplayTitle(record: RelatedRegistryRecord): string {
  return record.aliases[0] ?? formatSlugLabel(record.slug);
}

/** @deprecated Use registryDisplayTitle */
export function moduleDisplayTitle(record: ModuleRecord): string {
  return registryDisplayTitle(record);
}

function recordPageHref(record: RelatedRegistryRecord): string {
  if (record.kind === "concept") {
    return glossaryPageHref(record.slug);
  }
  return modulePageHref(record.slug);
}

function getConceptType(record: RelatedRegistryRecord): string | undefined {
  if (record.kind === "concept") {
    return record.conceptType;
  }
  return record.conceptType;
}

function sharesTag(sourceTags: string[], candidateTags: string[]): boolean {
  return sourceTags.some((tag) => candidateTags.includes(tag));
}

function toRelatedItem(
  record: RelatedRegistryRecord,
  reasonLabel: string,
): RelatedDocItem {
  return {
    registryId: record.id,
    slug: record.slug,
    title: registryDisplayTitle(record),
    href: recordPageHref(record),
    reasonLabel,
  };
}

/** Peers sharing `variantGroup` with the source module, excluding the source. */
export function deriveSameVariantGroupPeers(
  source: ModuleRecord,
  modules: ModuleRecord[],
): RelatedDocItem[] {
  if (!source.variantGroup) {
    return [];
  }

  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SAME_VARIANT_GROUP];
  return modules
    .filter(
      (candidate) =>
        candidate.id !== source.id &&
        candidate.variantGroup === source.variantGroup,
    )
    .map((record) => toRelatedItem(record, reasonLabel))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Peers sharing at least one tag with the source record, excluding the source. */
export function deriveSharedTagPeers(
  source: RelatedRegistryRecord,
  candidates: RelatedRegistryRecord[],
): RelatedDocItem[] {
  if (source.tags.length === 0) {
    return [];
  }

  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SHARED_TAGS];
  return candidates
    .filter(
      (candidate) =>
        candidate.id !== source.id && sharesTag(source.tags, candidate.tags),
    )
    .map((record) => toRelatedItem(record, reasonLabel))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Peers with the same `conceptType`, excluding the source. */
export function deriveSameConceptTypePeers(
  source: RelatedRegistryRecord,
  candidates: RelatedRegistryRecord[],
): RelatedDocItem[] {
  const sourceConceptType = getConceptType(source);
  if (!sourceConceptType) {
    return [];
  }

  const reasonLabel = DERIVED_RELATED_DOC_GROUP_LABELS[SAME_CONCEPT_TYPE];
  return candidates
    .filter(
      (candidate) =>
        candidate.id !== source.id &&
        getConceptType(candidate) === sourceConceptType,
    )
    .map((record) => toRelatedItem(record, reasonLabel))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function deriveRelatedDocGroups(
  source: RelatedRegistryRecord,
  candidates: RelatedRegistryRecord[],
  requestedGroups: string[],
): RelatedDocGroup[] {
  const groups: RelatedDocGroup[] = [];

  if (
    requestedGroups.includes(SAME_VARIANT_GROUP) &&
    source.kind === "module"
  ) {
    const moduleCandidates = candidates.filter(
      (candidate): candidate is ModuleRecord => candidate.kind === "module",
    );
    const items = deriveSameVariantGroupPeers(source, moduleCandidates);
    if (items.length > 0) {
      groups.push({
        id: SAME_VARIANT_GROUP,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SAME_VARIANT_GROUP],
        items,
      });
    }
  }

  if (requestedGroups.includes(SHARED_TAGS)) {
    const items = deriveSharedTagPeers(source, candidates);
    if (items.length > 0) {
      groups.push({
        id: SHARED_TAGS,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SHARED_TAGS],
        items,
      });
    }
  }

  if (requestedGroups.includes(SAME_CONCEPT_TYPE)) {
    const items = deriveSameConceptTypePeers(source, candidates);
    if (items.length > 0) {
      groups.push({
        id: SAME_CONCEPT_TYPE,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SAME_CONCEPT_TYPE],
        items,
      });
    }
  }

  return groups;
}
