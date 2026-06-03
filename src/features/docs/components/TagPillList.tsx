import Link from "next/link";
import { getRegistryTags } from "@/lib/content/registry-runtime";
import { formatTagLabel, tagPageHref } from "@/lib/content/tags";

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
  const tags = resolveTags(props);
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul
      className="my-4 flex flex-wrap gap-2"
      aria-label="Tags"
      data-testid="tag-pill-list"
    >
      {tags.map((slug) => (
        <li key={slug}>
          <Link
            href={tagPageHref(slug)}
            className="inline-flex items-center rounded-md border border-border bg-secondary px-2.5 py-1 text-sm text-secondary-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {formatTagLabel(slug)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
