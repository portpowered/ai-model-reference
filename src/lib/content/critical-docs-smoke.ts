import type { DocsPageSource } from "@/lib/content/pages";
import {
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

export type CriticalDocsSmokePage = LoadedDocsPageSource & {
  criticalRuleId: CriticalDocsSmokeRuleId;
  discoveryTags: readonly string[];
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
