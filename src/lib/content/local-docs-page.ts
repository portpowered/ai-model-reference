import { loadConceptPage } from "@/lib/content/concept-page";
import type { LoadedConceptPage } from "@/lib/content/concept-page-load";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import type { LoadedGlossaryPage } from "@/lib/content/glossary-page-load";
import { loadModelPage } from "@/lib/content/model-page";
import type { LoadedModelPage } from "@/lib/content/model-page-load";
import { loadModulePage } from "@/lib/content/module-page";
import type { LoadedModulePage } from "@/lib/content/module-page-load";
import { loadPaperPage } from "@/lib/content/paper-page";
import type { LoadedPaperPage } from "@/lib/content/paper-page-load";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import type { LoadedTrainingRegimePage } from "@/lib/content/training-regime-page-load";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

export type LocalDocsPageRef =
  | { section: "concepts"; slug: string }
  | { section: "glossary"; slug: string }
  | { section: "modules"; slug: string }
  | { section: "models"; slug: string }
  | { section: "papers"; slug: string }
  | { section: "training"; slug: string };

export type LoadedLocalDocsPage =
  | LoadedConceptPage
  | LoadedGlossaryPage
  | LoadedModulePage
  | LoadedModelPage
  | LoadedPaperPage
  | LoadedTrainingRegimePage;

const LOCAL_DOCS_SECTIONS = new Set([
  "concepts",
  "glossary",
  "modules",
  "models",
  "papers",
  "training",
]);

/** Parses catch-all slug segments for local-message page bundles. */
export function parseLocalDocsPageRef(
  slug: string[] | undefined,
): LocalDocsPageRef | null {
  if (slug?.length !== 2) {
    return null;
  }

  if (LOCAL_DOCS_SECTIONS.has(slug[0])) {
    return { section: slug[0] as LocalDocsPageRef["section"], slug: slug[1] };
  }

  return null;
}

/** True when Fumadocs frontmatter marks a page as colocated local messages. */
export function isLocalMessageDocsPage(pageData: {
  messageNamespace?: unknown;
}): boolean {
  return pageData.messageNamespace === "local";
}

/** True when catch-all slug segments identify a local docs page bundle. */
export function isLocalDocsCatchAllSlug(slug: string[] | undefined): boolean {
  return parseLocalDocsPageRef(slug) !== null;
}

export function localDocsRoute(
  ref: LocalDocsPageRef,
  locale: SiteLocale = defaultLocale,
): string {
  return buildLocalizedRoute(
    {
      surface: "docs-page",
      slug: `${ref.section}/${ref.slug}`,
    },
    locale,
  );
}

/** Loads a local docs page bundle with colocated messages and assets. */
export async function loadLocalDocsPage(
  ref: LocalDocsPageRef,
  locale: SiteLocale = defaultLocale,
): Promise<LoadedLocalDocsPage> {
  switch (ref.section) {
    case "concepts":
      return loadConceptPage(ref.slug, locale);
    case "glossary":
      return loadGlossaryPage(ref.slug, locale);
    case "modules":
      return loadModulePage(ref.slug, locale);
    case "models":
      return loadModelPage(ref.slug, locale);
    case "papers":
      return loadPaperPage(ref.slug, locale);
    case "training":
      return loadTrainingRegimePage(ref.slug, locale);
  }
}
