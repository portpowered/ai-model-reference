import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

type NonDefaultLocale = Exclude<SiteLocale, "en">;

const SHIPPED_LOCALIZED_DOCS: Record<NonDefaultLocale, string[]> = {
  vi: [
    "concepts/transformer-architecture",
    "glossary/autoregressive-generation",
    "glossary/embedding",
    "glossary/logit",
    "glossary/softmax",
    "glossary/token",
    "modules/attention",
    "modules/grouped-query-attention",
    "modules/linear-attention",
    "modules/multi-head-attention",
    "modules/multi-query-attention",
    "modules/sliding-window-attention",
  ],
};

const SHIPPED_LOCALIZED_DOCS_SET: Record<NonDefaultLocale, Set<string>> = {
  vi: new Set(SHIPPED_LOCALIZED_DOCS.vi),
};

/** Client-safe shipped-locale docs manifest for localized route gating. */
export function isShippedLocalizedDocsSlug(
  docsSlug: string,
  locale: SiteLocale,
): boolean {
  if (locale === defaultLocale) {
    return true;
  }

  return (
    SHIPPED_LOCALIZED_DOCS_SET[locale as NonDefaultLocale]?.has(docsSlug) ??
    false
  );
}
