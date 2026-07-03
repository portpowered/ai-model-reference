"use client";

import Link from "next/link";
import { docsChromeLinkClassName } from "@/features/docs/components/docs-chrome-link";
import { useOptionalPageMessagesContext } from "@/features/docs/components/page-messages-context";
import { localizeDocsHref } from "@/lib/content/localized-docs-href";
import {
  type ResolveRelatedRegistryDocsOptions,
  resolveRelatedRegistryDocs,
} from "@/lib/content/related-registry-docs";

export const DEFAULT_RELATED_REGISTRY_DOCS_EMPTY_FALLBACK =
  "No related reference pages are linked.";

export const DEFAULT_RELATED_REGISTRY_DOCS_ALL_UNAVAILABLE_FALLBACK =
  "No related reference pages are currently available.";

export const DEFAULT_RELATED_REGISTRY_DOCS_PARTIAL_UNAVAILABLE_STATUS =
  "Some related reference pages are not currently available.";

export type RelatedRegistryDocsProps = {
  registryIds: readonly string[];
  testId?: string;
  emptyFallback?: string;
  allUnavailableFallback?: string;
  partialUnavailableStatus?: string;
  resolveOptions?: ResolveRelatedRegistryDocsOptions;
};

export function RelatedRegistryDocs({
  registryIds,
  testId = "related-registry-docs",
  emptyFallback = DEFAULT_RELATED_REGISTRY_DOCS_EMPTY_FALLBACK,
  allUnavailableFallback = DEFAULT_RELATED_REGISTRY_DOCS_ALL_UNAVAILABLE_FALLBACK,
  partialUnavailableStatus = DEFAULT_RELATED_REGISTRY_DOCS_PARTIAL_UNAVAILABLE_STATUS,
  resolveOptions,
}: RelatedRegistryDocsProps) {
  const pageContext = useOptionalPageMessagesContext();
  const { available, unavailable } = resolveRelatedRegistryDocs(
    registryIds,
    resolveOptions,
  );

  if (registryIds.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid={`${testId}-empty`}
      >
        {emptyFallback}
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid={`${testId}-unavailable`}
      >
        {allUnavailableFallback}
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid={testId}>
      <ul className="space-y-3">
        {available.map((item) => {
          const href =
            pageContext && item.href
              ? localizeDocsHref(item.href, pageContext.locale)
              : item.href;

          return (
            <li key={item.registryId}>
              <Link
                href={href}
                className={`text-sm text-foreground ${docsChromeLinkClassName}`}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
      {unavailable.length > 0 ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid={`${testId}-partial-unavailable`}
          role="status"
        >
          {partialUnavailableStatus}
        </p>
      ) : null}
    </div>
  );
}
