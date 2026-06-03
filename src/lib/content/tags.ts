/** Human-readable label for a kebab-case tag slug. */
export function formatTagLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Canonical tag landing URL for a registry tag slug. */
export function tagPageHref(slug: string): string {
  return `/tags/${slug}`;
}
