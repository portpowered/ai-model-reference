import path from "node:path";
import type { Node } from "fumadocs-core/page-tree";
import { DOCS_ROOT } from "@/lib/content/content-paths";
import { hasPageMessagesFile } from "@/lib/content/page-messages-load";
import {
  defaultLocale,
  matchLocalizedRoute,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";

function shouldUseLocalizedDocsRoute(
  docsSlug: string,
  locale: SiteLocale,
): boolean {
  if (locale === defaultLocale) {
    return true;
  }

  return hasPageMessagesFile(path.join(DOCS_ROOT, docsSlug), locale);
}

function localizeNode(node: Node, locale: SiteLocale): Node {
  if ("url" in node && typeof node.url === "string") {
    const match = matchLocalizedRoute(node.url);
    if (match.kind === "matched") {
      const shouldLocalize =
        match.destination.surface !== "docs-page" ||
        shouldUseLocalizedDocsRoute(match.destination.slug, locale);

      return {
        ...node,
        url:
          locale === defaultLocale || !shouldLocalize
            ? node.url
            : switchRouteLocale(node.url, locale),
      };
    }
  }

  if ("children" in node && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) => localizeNode(child, locale)),
    };
  }

  return { ...node };
}

export function localizePageTree<T extends { children: Node[] }>(
  tree: T,
  locale: SiteLocale,
): T {
  if (locale === defaultLocale) {
    return tree;
  }

  return {
    ...tree,
    children: tree.children.map((child) => localizeNode(child, locale)),
  };
}
