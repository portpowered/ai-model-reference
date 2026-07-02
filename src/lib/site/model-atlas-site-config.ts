import { SCAFFOLD_ID, SITE_BRAND_NAME, SITE_HEADING } from "@/lib/scaffold";
import type { SiteConfig } from "./site-config.contract";

export const MODEL_ATLAS_REPOSITORY_URL =
  "https://github.com/portpowered/ai-model-reference" as const;

/** Model Atlas route surface ids referenced by navigation and home featured links. */
export const MODEL_ATLAS_ROUTE_SURFACES = [
  "home",
  "browse",
  "topology",
  "timeline",
  "tagsIndex",
] as const;

export type ModelAtlasRouteSurface =
  (typeof MODEL_ATLAS_ROUTE_SURFACES)[number];

/** Model Atlas collection ids represented in the site shell without binding renderers. */
export const MODEL_ATLAS_COLLECTION_IDS = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
] as const;

export type ModelAtlasCollectionId =
  (typeof MODEL_ATLAS_COLLECTION_IDS)[number];

export const modelAtlasSiteConfig = {
  brand: {
    scaffoldId: SCAFFOLD_ID,
    brandName: SITE_BRAND_NAME,
    siteHeading: SITE_HEADING,
  },
  repositoryUrl: MODEL_ATLAS_REPOSITORY_URL,
  routeSurfaces: {
    home: { surface: "home" },
    browse: { surface: "browse" },
    topology: { surface: "topology" },
    timeline: { surface: "docs-page", slug: "timeline" },
    tagsIndex: { surface: "tags-index" },
  },
  homeRouteSurface: "home",
  primaryNav: [
    { routeSurface: "home", labelKey: "home" },
    { routeSurface: "topology", labelKey: "topology" },
    { routeSurface: "timeline", labelKey: "timeline" },
    { routeSurface: "tagsIndex", labelKey: "tags" },
  ],
  collections: MODEL_ATLAS_COLLECTION_IDS.map((id) => ({ id })),
  homeFeaturedLinks: [
    {
      kind: "route",
      routeSurface: "browse",
      titleKey: "atlasLinkTitle",
      descriptionKey: "atlasLinkDescription",
    },
    {
      kind: "docs-page",
      slug: "modules/grouped-query-attention",
      titleKey: "gqaLinkTitle",
      descriptionKey: "gqaLinkDescription",
    },
    {
      kind: "docs-page",
      slug: "modules/swiglu",
      titleKey: "swigluLinkTitle",
      descriptionKey: "swigluLinkDescription",
    },
    {
      kind: "docs-page",
      slug: "modules/relu",
      titleKey: "reluLinkTitle",
      descriptionKey: "reluLinkDescription",
    },
  ],
} as const satisfies SiteConfig;
