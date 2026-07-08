import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  bulletlessListClassName,
  docsResourceCardLinkClassName,
} from "@/features/docs/components/list-decoration";
import { formatBlogPublishedDate } from "@/lib/content/blog-published-date";
import { formatTagLabel } from "@/lib/content/tag-labels";

export type BlogIndexPostCard = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  tags: string[];
  href: string;
};

type BlogIndexPostListProps = {
  posts: BlogIndexPostCard[];
  listLabel: string;
};

export function BlogIndexPostList({
  posts,
  listLabel,
}: BlogIndexPostListProps) {
  return (
    <ul className={bulletlessListClassName("mt-8")} aria-label={listLabel}>
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            href={post.href}
            className={docsResourceCardLinkClassName}
            aria-label={`Read blog post: ${post.title}`}
          >
            <span className="flex items-center gap-2 font-medium text-foreground">
              {post.title}
              <ArrowRight
                className="size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden
              />
            </span>
            <p className="mt-1 text-sm text-muted-foreground">
              {post.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
              <time dateTime={post.publishedAt}>
                {formatBlogPublishedDate(post.publishedAt)}
              </time>
              {post.tags.length > 0 ? (
                <ul
                  className="m-0 flex list-none flex-wrap gap-2 p-0"
                  aria-label="Tags"
                >
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-foreground">
                        {formatTagLabel(tag)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
