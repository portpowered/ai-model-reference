import type { ModuleRecord } from "@/lib/content/schemas";

export const SAME_VARIANT_GROUP = "same-variant-group" as const;

export type DerivedRelatedDocGroupId = typeof SAME_VARIANT_GROUP;

export const DERIVED_RELATED_DOC_GROUP_LABELS: Record<
  DerivedRelatedDocGroupId,
  string
> = {
  [SAME_VARIANT_GROUP]: "Same variant group",
};

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

/** Canonical module docs URL for a registry slug. */
export function modulePageHref(slug: string): string {
  return `/docs/modules/${slug}`;
}

/** Reader-facing title from registry aliases or slug. */
export function moduleDisplayTitle(record: ModuleRecord): string {
  return record.aliases[0] ?? formatSlugLabel(record.slug);
}

function toRelatedItem(
  record: ModuleRecord,
  reasonLabel: string,
): RelatedDocItem {
  return {
    registryId: record.id,
    slug: record.slug,
    title: moduleDisplayTitle(record),
    href: modulePageHref(record.slug),
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

/** Phase 1: only `same-variant-group` is derived; other group ids are ignored. */
export function deriveRelatedDocGroups(
  source: ModuleRecord,
  modules: ModuleRecord[],
  requestedGroups: string[],
): RelatedDocGroup[] {
  const groups: RelatedDocGroup[] = [];

  if (requestedGroups.includes(SAME_VARIANT_GROUP)) {
    const items = deriveSameVariantGroupPeers(source, modules);
    if (items.length > 0) {
      groups.push({
        id: SAME_VARIANT_GROUP,
        reasonLabel: DERIVED_RELATED_DOC_GROUP_LABELS[SAME_VARIANT_GROUP],
        items,
      });
    }
  }

  return groups;
}
