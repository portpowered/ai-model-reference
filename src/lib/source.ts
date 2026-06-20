import { loader } from "fumadocs-core/source";
import { excludeNonPublishedLocalDocsPlugin } from "@/lib/content/exclude-non-published-local-docs-plugin";
import { loadGeneratedDocsSourceBinding } from "@/lib/fumadocs-source-runtime";
import { buildGeneratedDocsPageTree } from "@/lib/navigation/generated-docs-page-tree";

const { docs } = await loadGeneratedDocsSourceBinding();

/** Maps local docs page bundles to reader URLs. */
function pageBundleSlug(file: { path: string }): string[] | undefined {
  if (!file.path.endsWith("/page.mdx")) {
    return undefined;
  }

  const sectionSlugs = file.path
    .slice(0, -"/page.mdx".length)
    .split("/")
    .filter(Boolean);

  if (
    sectionSlugs[0] === "concepts" ||
    sectionSlugs[0] === "glossary" ||
    sectionSlugs[0] === "modules" ||
    sectionSlugs[0] === "models" ||
    sectionSlugs[0] === "papers" ||
    sectionSlugs[0] === "training" ||
    sectionSlugs[0] === "systems"
  ) {
    return sectionSlugs;
  }

  return undefined;
}

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  slugs: pageBundleSlug,
  plugins: [excludeNonPublishedLocalDocsPlugin()],
});

source.pageTree = buildGeneratedDocsPageTree(source.pageTree);
