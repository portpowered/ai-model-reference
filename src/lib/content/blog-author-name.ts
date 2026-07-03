/** Formats blog author ids such as `site-team` for post metadata rows. */
export function formatBlogAuthorName(value: string): string {
  return value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
