"use client";

import Link from "next/link";
import { docsChromePillLinkClassName } from "@/features/docs/components/docs-chrome-link";
import { useOptionalPageMessagesContext } from "@/features/docs/components/page-messages-context";
import { tagPageHref } from "@/lib/content/content-hrefs";
import { getRegistryTags } from "@/lib/content/registry-runtime";
import { formatTagLabel } from "@/lib/content/tag-labels";

type TagPillListProps = {
  showDescriptions?: boolean;
} & (
  | { registryId: string; tags?: never }
  | { tags: string[]; registryId?: never }
);

function resolveTags(props: TagPillListProps): string[] {
  if ("tags" in props && props.tags !== undefined) {
    return props.tags;
  }
  if ("registryId" in props && props.registryId !== undefined) {
    return getRegistryTags(props.registryId) ?? [];
  }
  return [];
}

export function TagPillList(props: TagPillListProps) {
  const pageContext = useOptionalPageMessagesContext();
  const tags = resolveTags(props);
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul
      className="my-4 flex list-none flex-wrap gap-2 p-0"
      aria-label="Tags"
      data-testid="tag-pill-list"
    >
      {tags.map((slug) => (
        <li key={slug}>
          <Link
            href={tagPageHref(slug, pageContext?.locale ?? "en")}
            className={docsChromePillLinkClassName}
          >
            {formatTagLabel(slug)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
