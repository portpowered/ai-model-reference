import type { TOCItemType } from "fumadocs-core/toc";
import { extractSectionAnchorsFromMdx } from "@/lib/build/validate-links";
import { lookupMessage } from "@/lib/content/messages";
import type { PageMessages } from "@/lib/content/schemas";

/** Section headings render as h2 in local glossary and module MDX pages. */
const LOCAL_DOCS_SECTION_TOC_DEPTH = 2;

/** Builds a Fumadocs TOC from `<Section>` anchors and localized section titles. */
export function buildLocalDocsTableOfContents(
  mdxContent: string,
  messages: PageMessages,
): TOCItemType[] {
  const toc: TOCItemType[] = [];

  for (const anchor of extractSectionAnchorsFromMdx(mdxContent)) {
    const titleResult = lookupMessage(messages, anchor.titleKey);
    if (!titleResult.ok) {
      continue;
    }

    toc.push({
      title: titleResult.value,
      url: `#${anchor.id}`,
      depth: LOCAL_DOCS_SECTION_TOC_DEPTH,
    });
  }

  return toc;
}
