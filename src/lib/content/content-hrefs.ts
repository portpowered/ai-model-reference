/** Canonical docs URL for a glossary entry slug. */
export function glossaryPageHref(slug: string): string {
  return `/docs/glossary/${slug}`;
}

/** Canonical docs URL for a concept entry slug under `docs/concepts`. */
export function conceptPageHref(slug: string): string {
  return `/docs/concepts/${slug}`;
}

/** Canonical docs URL for a module entry slug. */
export function modulePageHref(slug: string): string {
  return `/docs/modules/${slug}`;
}

/** Canonical tag landing URL for a registry tag slug. */
export function tagPageHref(slug: string): string {
  return `/tags/${slug}`;
}
