/**
 * Prefixes an internal app href with a GitHub Pages project-site base path.
 * External URLs, hash links, and already-prefixed paths are returned unchanged.
 */
export function withBasePath(href: string, basePath = ""): string {
  if (
    basePath === "" ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("#")
  ) {
    return href;
  }

  if (href === basePath || href.startsWith(`${basePath}/`)) {
    return href;
  }

  const normalizedPath = href.startsWith("/") ? href : `/${href}`;
  return `${basePath}${normalizedPath}`;
}
