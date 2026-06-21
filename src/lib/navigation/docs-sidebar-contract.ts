import type * as PageTree from "fumadocs-core/page-tree";
import type { Node } from "fumadocs-core/page-tree";

export const TOKEN_GLOSSARY_URL = "/docs/glossary/token";
export const GROUPED_QUERY_ATTENTION_URL =
  "/docs/modules/grouped-query-attention";
export const WHY_LONG_CONTEXT_IS_HARD_URL =
  "/docs/concepts/why-long-context-is-hard";
export const DPO_TRAINING_URL = "/docs/training/dpo";
export const ROUTING_SYSTEM_URL = "/docs/systems/routing";

/** Copy shown only by the legacy DocsShell placeholder sidebar. */
export const PLACEHOLDER_SIDEBAR_DESCRIPTION =
  "Browse modules, concepts, and tags.";

export type SidebarPageLink = {
  name: string;
  url: string;
};

export function collectSidebarPageLinks(
  nodes: Node[] | PageTree.Root,
): SidebarPageLink[] {
  const children = Array.isArray(nodes) ? nodes : nodes.children;
  const links: SidebarPageLink[] = [];

  for (const node of children) {
    if (
      node.type === "page" &&
      "url" in node &&
      typeof node.url === "string" &&
      typeof node.name === "string"
    ) {
      links.push({ name: node.name, url: node.url });
    }
    if (node.type === "folder" && "children" in node) {
      links.push(...collectSidebarPageLinks(node.children));
    }
  }

  return links;
}

export function findSidebarPageLink(
  links: SidebarPageLink[],
  url: string,
): SidebarPageLink | undefined {
  return links.find((link) => link.url === url);
}

/** Removes embedded payloads so placeholder UI copy in messages JSON does not false-fail HTML checks. */
export function stripHtmlScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

export function extractNdSidebarHtml(html: string): string {
  const sidebarStart = html.indexOf('id="nd-sidebar"');
  if (sidebarStart < 0) {
    return "";
  }

  const pageStart = html.indexOf('id="nd-page"', sidebarStart);
  const searchEnd = pageStart > sidebarStart ? pageStart : html.length;
  return html.slice(sidebarStart, searchEnd);
}

export function hasLegacyPlaceholderSidebar(html: string): boolean {
  return (
    html.includes('aria-label="Docs sidebar"') &&
    html.includes(PLACEHOLDER_SIDEBAR_DESCRIPTION)
  );
}
