import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

export type NonDefaultLocale = Exclude<SiteLocale, "en">;

export type ShippedLocalizedDocsManifest = Record<
  NonDefaultLocale,
  readonly string[]
>;

const SHIPPED_LOCALIZED_DOCS: ShippedLocalizedDocsManifest = {
  ja: [],
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

function shippedLocalizedDocsSet(
  manifest: ShippedLocalizedDocsManifest,
): Record<NonDefaultLocale, Set<string>> {
  return {
    ja: new Set(manifest.ja),
    vi: new Set(manifest.vi),
  };
}

export function resolveShippedLocalizedDocsManifest(
  overrides: Partial<ShippedLocalizedDocsManifest> = {},
): ShippedLocalizedDocsManifest {
  return {
    ja: overrides.ja ?? SHIPPED_LOCALIZED_DOCS.ja,
    vi: overrides.vi ?? SHIPPED_LOCALIZED_DOCS.vi,
  };
}

export function getShippedLocalizedDocsSlugs(
  locale: NonDefaultLocale,
  manifest: ShippedLocalizedDocsManifest = SHIPPED_LOCALIZED_DOCS,
): readonly string[] {
  return manifest[locale];
}

/** Client-safe shipped-locale docs manifest for localized route gating. */
export function isShippedLocalizedDocsSlug(
  docsSlug: string,
  locale: SiteLocale,
  manifest: ShippedLocalizedDocsManifest = SHIPPED_LOCALIZED_DOCS,
): boolean {
  if (locale === defaultLocale) {
    return true;
  }

  const shippedDocsSet = shippedLocalizedDocsSet(manifest);
  return shippedDocsSet[locale as NonDefaultLocale]?.has(docsSlug) ?? false;
}
