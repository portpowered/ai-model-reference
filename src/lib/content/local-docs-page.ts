import { loadConceptPage } from "@/lib/content/concept-page";
import type { LoadedConceptPage } from "@/lib/content/concept-page-load";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import type { LoadedGlossaryPage } from "@/lib/content/glossary-page-load";
import { loadModulePage } from "@/lib/content/module-page";
import type { LoadedModulePage } from "@/lib/content/module-page-load";

export type LocalDocsPageRef =
  | { section: "concepts"; slug: string }
  | { section: "glossary"; slug: string }
  | { section: "modules"; slug: string };

export type LoadedLocalDocsPage =
  | LoadedConceptPage
  | LoadedGlossaryPage
  | LoadedModulePage;

/** Parses catch-all slug segments for glossary or module local-message pages. */
export function parseLocalDocsPageRef(
  slug: string[] | undefined,
): LocalDocsPageRef | null {
  if (slug?.length !== 2) {
    return null;
  }

  if (
    slug[0] === "concepts" ||
    slug[0] === "glossary" ||
    slug[0] === "modules"
  ) {
    return { section: slug[0], slug: slug[1] };
  }

  return null;
}

/** True when Fumadocs frontmatter marks a page as colocated local messages. */
export function isLocalMessageDocsPage(pageData: {
  messageNamespace?: unknown;
}): boolean {
  return pageData.messageNamespace === "local";
}

/** True when catch-all slug segments identify a glossary or module page bundle. */
export function isLocalDocsCatchAllSlug(slug: string[] | undefined): boolean {
  return parseLocalDocsPageRef(slug) !== null;
}

/** Loads a glossary or module page with colocated messages and assets. */
export async function loadLocalDocsPage(
  ref: LocalDocsPageRef,
  locale = "en",
): Promise<LoadedLocalDocsPage> {
  if (ref.section === "concepts") {
    return loadConceptPage(ref.slug, locale);
  }

  if (ref.section === "glossary") {
    return loadGlossaryPage(ref.slug, locale);
  }

  return loadModulePage(ref.slug, locale);
}
