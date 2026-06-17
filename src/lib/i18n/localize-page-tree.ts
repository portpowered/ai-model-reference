import type { Node } from "fumadocs-core/page-tree";
import {
  defaultLocale,
  matchLocalizedRoute,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";

function localizeNode(node: Node, locale: SiteLocale): Node {
  if ("url" in node && typeof node.url === "string") {
    const match = matchLocalizedRoute(node.url);
    if (match.kind === "matched") {
      return {
        ...node,
        url:
          locale === defaultLocale
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
