import { SHIPPED_LOCALIZED_DOCS } from "@/generated/shipped-localized-docs";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

export type NonDefaultLocale = Exclude<SiteLocale, "en">;

export type ShippedLocalizedDocsManifest = Record<
  NonDefaultLocale,
  readonly string[]
>;
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
