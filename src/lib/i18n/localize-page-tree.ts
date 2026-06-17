import type { Node } from "fumadocs-core/page-tree";
import { isDocsPageShippedForLocale } from "@/lib/content/pages";
import {
  defaultLocale,
  matchLocalizedRoute,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";

function trimEmptySeparators(children: Node[]): Node[] {
  const trimmed: Node[] = [];

  for (const child of children) {
    if (child.type === "separator") {
      const previous = trimmed.at(-1);
      if (!previous || previous.type === "separator") {
        continue;
      }
    }

    trimmed.push(child);
  }

  while (trimmed.at(-1)?.type === "separator") {
    trimmed.pop();
  }

  return trimmed;
}

function localizeNode(node: Node, locale: SiteLocale): Node | null {
  if ("url" in node && typeof node.url === "string") {
    const match = matchLocalizedRoute(node.url);
    if (match.kind === "matched") {
      if (
        locale !== defaultLocale &&
        match.destination.surface === "docs-page" &&
        !isDocsPageShippedForLocale(match.destination.slug, locale)
      ) {
        return null;
      }

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
    const children = trimEmptySeparators(
      node.children
        .map((child) => localizeNode(child, locale))
        .filter((child): child is Node => child !== null),
    );
    if (children.length === 0) {
      return null;
    }

    return {
      ...node,
      children,
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
    children: trimEmptySeparators(
      tree.children
        .map((child) => localizeNode(child, locale))
        .filter((child): child is Node => child !== null),
    ),
  };
}
