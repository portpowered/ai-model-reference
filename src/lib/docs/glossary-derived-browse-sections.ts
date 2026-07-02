import type { DocsPageSource } from "@/lib/content/pages";
import {
  getConceptById,
  listClassificationAncestors,
  resolveClassificationId,
} from "@/lib/content/registry-runtime";
import type { ConceptRecord } from "@/lib/content/schemas";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import type { BrowseCollectionSection } from "@/lib/docs/browse-collection-sections";
import { toDocsIndexEntries } from "@/lib/docs/docs-index-entries";
import { resolveUiMessagePath } from "@/lib/docs/section-collection-index";
import {
  buildLocalizedRoute,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

/** Reader-visible glossary-derived browse sections backed by ontology branches. */
export const GLOSSARY_DERIVED_BROWSE_SECTION_IDS = [
  "model-types",
  "inference",
  "module-components",
] as const;

export type GlossaryDerivedBrowseSectionId =
  (typeof GLOSSARY_DERIVED_BROWSE_SECTION_IDS)[number];

type GlossaryDerivedSectionConfig = {
  classificationRootId: string;
  browseMessagePrefix: "modelTypes" | "inference" | "moduleComponents";
  sidebarLabel: string;
  starterSlugs: readonly string[];
};

const GLOSSARY_DERIVED_SECTION_CONFIG = {
  "model-types": {
    classificationRootId: "classification.concept.model-type",
    browseMessagePrefix: "modelTypes",
    sidebarLabel: "Model Types",
    starterSlugs: [
      "glossary/world-model",
      "glossary/generative-model",
      "glossary/multimodal-model",
      "glossary/autoregressive-generation",
      "glossary/foundation-model",
      "glossary/discriminative-model",
      "glossary/modality",
      "glossary/diffusion-model",
      "glossary/encoder",
      "glossary/decoder",
      "glossary/encoder-decoder",
    ],
  },
  inference: {
    classificationRootId: "classification.concept.inference",
    browseMessagePrefix: "inference",
    sidebarLabel: "Inference",
    starterSlugs: [
      "glossary/sampling-overview",
      "glossary/top-k-sampling",
      "glossary/top-p-sampling",
      "glossary/greedy-decoding",
      "glossary/temperature",
      "glossary/decode",
      "glossary/kv-cache",
      "glossary/time-to-first-token",
      "glossary/inter-token-latency",
    ],
  },
  "module-components": {
    classificationRootId: "classification.concept.module",
    browseMessagePrefix: "moduleComponents",
    sidebarLabel: "Module Components",
    starterSlugs: [
      "glossary/softmax",
      "glossary/residual-connection",
      "glossary/skip-connection",
      "glossary/activation",
      "glossary/normalization",
      "glossary/embedding",
      "glossary/logit",
      "glossary/tensor",
      "glossary/vector",
      "glossary/vocabulary-size",
    ],
  },
} as const satisfies Record<
  GlossaryDerivedBrowseSectionId,
  GlossaryDerivedSectionConfig
>;

export function getGlossaryDerivedSectionConfig(
  sectionId: GlossaryDerivedBrowseSectionId,
): GlossaryDerivedSectionConfig {
  return GLOSSARY_DERIVED_SECTION_CONFIG[sectionId];
}

export function getGlossaryDerivedSidebarLabel(
  sectionId: GlossaryDerivedBrowseSectionId,
): string {
  return GLOSSARY_DERIVED_SECTION_CONFIG[sectionId].sidebarLabel;
}

export function conceptRecordBelongsToClassificationBranch(
  record: Pick<
    ConceptRecord,
    "primaryClassificationId" | "secondaryClassificationIds"
  >,
  branchRootId: string,
): boolean {
  const classificationIds = [
    record.primaryClassificationId,
    ...(record.secondaryClassificationIds ?? []),
  ].filter((classificationId): classificationId is string =>
    Boolean(classificationId),
  );

  for (const classificationId of classificationIds) {
    const resolvedId =
      resolveClassificationId(classificationId) ?? classificationId;
    if (resolvedId === branchRootId) {
      return true;
    }

    const ancestors = listClassificationAncestors(resolvedId);
    if (ancestors.some((ancestor) => ancestor.id === branchRootId)) {
      return true;
    }
  }

  return false;
}

export function glossaryPageBelongsToDerivedSection(
  page: DocsPageSource,
  sectionId: GlossaryDerivedBrowseSectionId,
): boolean {
  if (page.frontmatter.kind !== "glossary") {
    return false;
  }

  const record = getConceptById(page.frontmatter.registryId);
  if (!record) {
    return false;
  }

  return conceptRecordBelongsToClassificationBranch(
    record,
    GLOSSARY_DERIVED_SECTION_CONFIG[sectionId].classificationRootId,
  );
}

export function isGlossaryPageAssignedToDerivedSection(
  page: DocsPageSource,
): boolean {
  return GLOSSARY_DERIVED_BROWSE_SECTION_IDS.some((sectionId) =>
    glossaryPageBelongsToDerivedSection(page, sectionId),
  );
}

export function filterGlossaryPagesForDerivedSection(
  pages: readonly DocsPageSource[],
  sectionId: GlossaryDerivedBrowseSectionId,
): DocsPageSource[] {
  return pages.filter((page) =>
    glossaryPageBelongsToDerivedSection(page, sectionId),
  );
}

function resolveDerivedBrowseMessagePath(
  messages: UiMessages | Record<string, unknown>,
  prefix: GlossaryDerivedSectionConfig["browseMessagePrefix"],
  suffix: "SectionTitle" | "SectionDescription" | "SectionLinkLabel",
): string {
  return resolveUiMessagePath(messages, `browseIndex.${prefix}${suffix}`);
}

export function buildGlossaryDerivedBrowseSection({
  sectionId,
  pages,
  locale,
  messages,
}: {
  sectionId: GlossaryDerivedBrowseSectionId;
  pages: readonly DocsPageSource[];
  locale: SiteLocale;
  messages: UiMessages | Record<string, unknown>;
}): BrowseCollectionSection {
  const config = GLOSSARY_DERIVED_SECTION_CONFIG[sectionId];
  const sectionPages = filterGlossaryPagesForDerivedSection(pages, sectionId);
  const browseHref = buildLocalizedRoute({ surface: "browse" }, locale);

  return {
    id: sectionId,
    title: resolveDerivedBrowseMessagePath(
      messages,
      config.browseMessagePrefix,
      "SectionTitle",
    ),
    description: resolveDerivedBrowseMessagePath(
      messages,
      config.browseMessagePrefix,
      "SectionDescription",
    ),
    entries: toDocsIndexEntries(
      sectionPages,
      locale,
      [...config.starterSlugs],
      config.starterSlugs.length,
    ),
    linkLabel: resolveDerivedBrowseMessagePath(
      messages,
      config.browseMessagePrefix,
      "SectionLinkLabel",
    ),
    linkHref: `${browseHref}#${sectionId}`,
  };
}

export function buildGlossaryDerivedBrowseSections({
  pages,
  locale,
  messages,
}: {
  pages: readonly DocsPageSource[];
  locale: SiteLocale;
  messages: UiMessages | Record<string, unknown>;
}): BrowseCollectionSection[] {
  return GLOSSARY_DERIVED_BROWSE_SECTION_IDS.map((sectionId) =>
    buildGlossaryDerivedBrowseSection({
      sectionId,
      pages,
      locale,
      messages,
    }),
  );
}
