import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import Link from "next/link";
import {
  blogPostHref,
  listPublishedBlogPosts,
} from "@/lib/content/blog-page-load";

export const metadata = {
  title: "Blog",
  description:
    "Narrative posts that connect releases and training concepts back to canonical reference pages.",
};

export default async function BlogIndexPage() {
  const posts = await listPublishedBlogPosts();

  return (
    <DocsPage breadcrumb={{ enabled: false }}>
      <DocsTitle>Blog</DocsTitle>
      <DocsDescription>
        Narrative posts that connect releases and training concepts back to
        canonical reference pages.
      </DocsDescription>
      <DocsBody>
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
                href={blogPostHref(post.slug)}
              >
                <h2 className="text-lg font-semibold text-foreground">
                  {post.messages.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {post.messages.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </DocsBody>
    </DocsPage>
  );
}
