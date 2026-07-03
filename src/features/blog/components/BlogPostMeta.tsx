import { formatBlogAuthorName } from "@/lib/content/blog-author-name";
import { formatBlogPublishedDate } from "@/lib/content/blog-published-date";
import { formatTagLabel } from "@/lib/content/tag-labels";

type BlogPostMetaProps = {
  publishedAt: string;
  authors: string[];
  tags: string[];
};

export function BlogPostMeta({
  publishedAt,
  authors,
  tags,
}: BlogPostMetaProps) {
  return (
    <div className="not-prose mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <time dateTime={publishedAt}>{formatBlogPublishedDate(publishedAt)}</time>
      {authors.length > 0 ? (
        <span>
          <span className="sr-only">Authors: </span>
          {authors.map(formatBlogAuthorName).join(", ")}
        </span>
      ) : null}
      {tags.length > 0 ? (
        <ul
          className="m-0 flex list-none flex-wrap gap-2 p-0"
          aria-label="Tags"
        >
          {tags.map((tag) => (
            <li key={tag}>
              <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-foreground">
                {formatTagLabel(tag)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
