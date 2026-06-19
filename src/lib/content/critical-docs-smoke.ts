import type { LocalDocsPageRef } from "@/lib/content/local-docs-page";
import {
  type DocsPageSource,
  type DocsPageSource as LoadedDocsPageSource,
  loadShippedLocalizedDocsPages,
} from "@/lib/content/pages";
import { resolvePublishedResourceTags } from "@/lib/content/phase-1-published-resources";
import { loadRegistry } from "@/lib/content/registry";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

export const CRITICAL_DOCS_SMOKE_RULES = [
  {
    id: "attention-module",
    pageKind: "module",
    requiredTag: "attention",
  },
  {
    id: "token-to-probability-chain-glossary",
    pageKind: "glossary",
    requiredTag: "token-to-probability-chain",
  },
] as const;

export type CriticalDocsSmokeRule = (typeof CRITICAL_DOCS_SMOKE_RULES)[number];
export type CriticalDocsSmokeRuleId = CriticalDocsSmokeRule["id"];

/**
 * Shared representative probes for downstream smoke surfaces.
 * These stay behavior-focused and intentionally do not enumerate every
 * discovered critical page; export/search verifiers should consume this
 * projection instead of carrying their own page inventories.
 */
export const CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PROBES = [
  {
    id: "gqa-abbreviation",
    criticalRuleId: "attention-module",
    docsUrl: "/docs/modules/grouped-query-attention",
    exportRoute: "/docs/modules/grouped-query-attention",
    searchQuery: "GQA",
    searchSurface: "api-and-page",
    purpose:
      "Proves acronym search still ranks the grouped-query-attention page first.",
  },
  {
    id: "attention-family-overview",
    criticalRuleId: "attention-module",
    docsUrl: "/docs/modules/attention",
    exportRoute: "/docs/modules/attention",
    searchQuery: "attention",
    searchSurface: "api-and-page",
    purpose:
      "Proves family-level attention discovery still returns the canonical bridge page and nearby variants.",
  },
  {
    id: "vector-foundation",
    criticalRuleId: "token-to-probability-chain-glossary",
    docsUrl: "/docs/glossary/vector",
    exportRoute: "/docs/glossary/vector",
    searchQuery: "vector",
    searchSurface: "api-only",
    purpose:
      "Proves the token-to-probability chain retains a foundational glossary hit for a single-term query.",
  },
  {
    id: "hidden-size-multiword",
    criticalRuleId: "token-to-probability-chain-glossary",
    docsUrl: "/docs/glossary/hidden-size",
    searchQuery: "hidden size",
    searchSurface: "api-only",
    purpose:
      "Proves glossary discovery still handles a multi-word canonical query without fragment duplication.",
  },
  {
    id: "gqa-kv-cache-variant",
    criticalRuleId: "attention-module",
    docsUrl: "/docs/modules/grouped-query-attention",
    searchQuery: "KV cache",
    searchSurface: "api-and-page",
    purpose:
      "Proves the KV-cache optimization path still exposes a concrete attention variant readers look for.",
  },
] as const;

export type CriticalDocsSmokeRepresentativeProbe =
  (typeof CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PROBES)[number];
export type CriticalDocsSmokeRepresentativeExportRoute = Extract<
  CriticalDocsSmokeRepresentativeProbe,
  { exportRoute: string }
>["exportRoute"];

export const CRITICAL_DOCS_SMOKE_REPRESENTATIVE_EXPORT_ROUTES =
  CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PROBES.flatMap((probe) =>
    "exportRoute" in probe ? [probe.exportRoute] : [],
  ) as readonly CriticalDocsSmokeRepresentativeExportRoute[];

export const CRITICAL_DOCS_SMOKE_REPRESENTATIVE_API_SEARCH_PROBES =
  CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PROBES.filter(
    (probe) =>
      probe.searchSurface === "api-and-page" ||
      probe.searchSurface === "api-only",
  );

export const CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PAGE_SEARCH_QUERIES =
  CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PROBES.filter(
    (probe) => probe.searchSurface === "api-and-page",
  ).map((probe) => probe.searchQuery) as readonly string[];

export type CriticalDocsSmokePage = LoadedDocsPageSource & {
  criticalRuleId: CriticalDocsSmokeRuleId;
  discoveryTags: readonly string[];
};

export type CriticalDocsSmokeLocalRef = LocalDocsPageRef & {
  routeSlug: [string, string];
};

export function matchCriticalDocsSmokeRule(input: {
  pageKind: DocsPageSource["frontmatter"]["kind"];
  tags: readonly string[];
}): CriticalDocsSmokeRule | null {
  return (
    CRITICAL_DOCS_SMOKE_RULES.find(
      (rule) =>
        rule.pageKind === input.pageKind &&
        input.tags.includes(rule.requiredTag),
    ) ?? null
  );
}

export function toCriticalDocsSmokeLocalRef(
  page: Pick<CriticalDocsSmokePage, "docsSlug">,
): CriticalDocsSmokeLocalRef {
  const [section, slug, ...rest] = page.docsSlug.split("/");
  if (!section || !slug || rest.length > 0) {
    throw new Error(
      `Critical docs smoke page must use a two-segment docsSlug, got ${page.docsSlug}`,
    );
  }

  return {
    section: section as LocalDocsPageRef["section"],
    slug,
    routeSlug: [section, slug],
  };
}

export async function loadCriticalDocsSmokePages(
  locale: SiteLocale = defaultLocale,
): Promise<readonly CriticalDocsSmokePage[]> {
  const [pages, registry] = await Promise.all([
    loadShippedLocalizedDocsPages(locale),
    loadRegistry(),
  ]);

  const discoveredPages: CriticalDocsSmokePage[] = [];

  for (const page of pages) {
    const discoveryTags = resolvePublishedResourceTags(page, registry);
    const rule = matchCriticalDocsSmokeRule({
      pageKind: page.frontmatter.kind,
      tags: discoveryTags,
    });

    if (!rule) {
      continue;
    }

    discoveredPages.push({
      ...page,
      criticalRuleId: rule.id,
      discoveryTags,
    });
  }

  return discoveredPages.sort((left, right) =>
    left.url.localeCompare(right.url, "en"),
  );
}
