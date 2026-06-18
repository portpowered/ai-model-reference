/** True when a virtual docs path points at a local docs page bundle. */
export function isLocalDocsPageBundlePath(path: string): boolean {
  if (!path.endsWith("/page.mdx")) {
    return false;
  }

  const sectionSlugs = path
    .slice(0, -"/page.mdx".length)
    .split("/")
    .filter(Boolean);

  return (
    sectionSlugs.length === 2 &&
    (sectionSlugs[0] === "concepts" ||
      sectionSlugs[0] === "glossary" ||
      sectionSlugs[0] === "modules" ||
      sectionSlugs[0] === "models" ||
      sectionSlugs[0] === "papers" ||
      sectionSlugs[0] === "training" ||
      sectionSlugs[0] === "systems")
  );
}

/** Published local docs bundles are routable; draft/archived bundles stay maintainer-only. */
export function isRoutableLocalDocsPageData(data: {
  status?: unknown;
  messageNamespace?: unknown;
}): boolean {
  if (data.messageNamespace !== "local") {
    return true;
  }

  return data.status === "published";
}

/** True when a local docs bundle should be removed from Fumadocs routing/storage. */
export function shouldExcludeLocalDocsPageFromRouting(
  path: string,
  data: { status?: unknown; messageNamespace?: unknown },
): boolean {
  return (
    isLocalDocsPageBundlePath(path) &&
    data.messageNamespace === "local" &&
    !isRoutableLocalDocsPageData(data)
  );
}
