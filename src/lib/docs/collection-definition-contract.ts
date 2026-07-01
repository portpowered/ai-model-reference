import type { PageKind, RegistryKind } from "@/lib/content/schemas";

/** Stable ids for the AI docs atlas collections. */
export type DocsCollectionId =
  | "glossary"
  | "concepts"
  | "modules"
  | "models"
  | "papers"
  | "training"
  | "systems";

export const DOCS_COLLECTION_IDS = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
] as const satisfies readonly DocsCollectionId[];

/** Public route slug segment under `/docs`. */
export type DocsCollectionRouteSlug = DocsCollectionId;

/** Registry kinds referenced by published AI docs collection pages. */
export type DocsCollectionRegistryKind = Extract<
  RegistryKind,
  "model" | "module" | "concept" | "paper" | "training-regime" | "system"
>;

/** Frontmatter kinds on published AI docs collection pages. */
export type DocsCollectionFrontmatterKind = Extract<
  PageKind,
  | "glossary"
  | "concept"
  | "module"
  | "model"
  | "paper"
  | "training-regime"
  | "system"
>;

/**
 * Identifies sidebar grouping behavior for collections that partition pages
 * into labeled groups. Models and papers sort directly by page title and omit
 * this field.
 */
export const DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS = [
  "glossary",
  "concepts",
  "modules",
  "training",
  "systems",
] as const;

export type DocsCollectionSidebarGroupingResolverId =
  (typeof DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS)[number];

/** Message key paths in `UiMessages` for browse cards and section index pages. */
export type DocsCollectionMessageKeys = {
  browse: {
    sectionTitle: string;
    sectionDescription: string;
    sectionLinkLabel: string;
  };
  index: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
};

/**
 * Typed contract for a docs collection before runtime consumers migrate to
 * shared config.
 */
export type DocsCollectionDefinition = {
  id: DocsCollectionId;
  /** Public route slug under `/docs`. Independent from `frontmatterKind`. */
  routeSlug: DocsCollectionRouteSlug;
  registryKind: DocsCollectionRegistryKind;
  /** Frontmatter kind on published docs pages. Independent from `routeSlug`. */
  frontmatterKind: DocsCollectionFrontmatterKind;
  /** Route-relative docs slugs featured on the browse page for this collection. */
  starterSlugs: readonly string[];
  messageKeys: DocsCollectionMessageKeys;
  sidebarGroupingResolverId?: DocsCollectionSidebarGroupingResolverId;
};

export function isDocsCollectionSidebarGroupingResolverId(
  value: string,
): value is DocsCollectionSidebarGroupingResolverId {
  return (
    DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS as readonly string[]
  ).includes(value);
}
