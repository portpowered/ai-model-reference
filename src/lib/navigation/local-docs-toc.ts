import type { TOCItemType } from "fumadocs-core/toc";
import { lookupMessage } from "@/lib/content/messages";
import type { PageMessages } from "@/lib/content/schemas";

/** Section headings render as h2 in local glossary and module MDX pages. */
const LOCAL_DOCS_SECTION_TOC_DEPTH = 2;

function parseSectionTagAttributes(attributes: string): {
  id?: string;
  titleKey?: string;
} {
  const id = attributes.match(/\sid=["']([^"']+)["']/)?.[1]?.trim();
  const titleKey = attributes.match(/\stitleKey=["']([^"']+)["']/)?.[1]?.trim();
  return { id, titleKey };
}

function extractSectionAnchorsFromLocalMdx(content: string): Array<{
  id: string;
  titleKey: string;
}> {
  const anchors: Array<{ id: string; titleKey: string }> = [];
  const sectionTagPattern = /<Section\b([^>]*)\/?>/g;

  for (const match of content.matchAll(sectionTagPattern)) {
    const { id, titleKey } = parseSectionTagAttributes(match[1] ?? "");
    if (id && titleKey) {
      anchors.push({ id, titleKey });
    }
  }

  return anchors;
}

/** Builds a Fumadocs TOC from `<Section>` anchors and localized section titles. */
export function buildLocalDocsTableOfContents(
  mdxContent: string,
  messages: PageMessages,
): TOCItemType[] {
  const toc: TOCItemType[] = [];

  for (const anchor of extractSectionAnchorsFromLocalMdx(mdxContent)) {
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
