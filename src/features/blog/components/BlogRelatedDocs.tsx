import {
  DEFAULT_RELATED_REGISTRY_DOCS_PARTIAL_UNAVAILABLE_STATUS,
  RelatedRegistryDocs,
} from "@/features/docs/components/RelatedRegistryDocs";
import type { ResolveRelatedRegistryDocsOptions } from "@/lib/content/related-registry-docs";

export const BLOG_RELATED_DOCS_EMPTY_FALLBACK =
  "No related reference pages are linked for this post.";

export const BLOG_RELATED_DOCS_ALL_UNAVAILABLE_FALLBACK =
  "No related reference pages are currently available for this post.";

export const BLOG_RELATED_DOCS_PARTIAL_UNAVAILABLE_STATUS =
  DEFAULT_RELATED_REGISTRY_DOCS_PARTIAL_UNAVAILABLE_STATUS;

export type BlogRelatedDocsProps = {
  relatedDocIds: readonly string[];
  resolveOptions?: ResolveRelatedRegistryDocsOptions;
};

export function BlogRelatedDocs({
  relatedDocIds,
  resolveOptions,
}: BlogRelatedDocsProps) {
  return (
    <RelatedRegistryDocs
      registryIds={relatedDocIds}
      testId="blog-related-docs"
      emptyFallback={BLOG_RELATED_DOCS_EMPTY_FALLBACK}
      allUnavailableFallback={BLOG_RELATED_DOCS_ALL_UNAVAILABLE_FALLBACK}
      partialUnavailableStatus={BLOG_RELATED_DOCS_PARTIAL_UNAVAILABLE_STATUS}
      resolveOptions={resolveOptions}
    />
  );
}
