import { renderBlogPostPage } from "@/app/(site)/site-renderers";
import { blogPostHref, listBlogSlugs } from "@/lib/content/blog-page-load";
import { getPublishedBlogPostBySlug } from "@/lib/content/blog-post-get";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const published = await getPublishedBlogPostBySlug(slug);

  if (!published) {
    return {};
  }

  return {
    title: published.messages.title,
    description: published.messages.description,
    alternates: {
      canonical: blogPostHref(slug),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  return renderBlogPostPage(slug);
}
