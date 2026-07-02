import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadBlogPost } from "@/lib/content/blog-page";
import { blogPostHref, listBlogSlugs } from "@/lib/content/blog-page-load";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await loadBlogPost(slug);

  if (post.frontmatter.status !== "published") {
    return {};
  }

  return {
    title: post.messages.title,
    description: post.messages.description,
    alternates: {
      canonical: blogPostHref(slug),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await loadBlogPost(slug);

  if (post.frontmatter.status !== "published") {
    notFound();
  }

  return (
    <DocsPage breadcrumb={{ enabled: false }} toc={post.toc}>
      <ModulePageProviders assets={post.assets} messages={post.messages}>
        <DocsTitle>{post.messages.title}</DocsTitle>
        <DocsDescription>{post.messages.description}</DocsDescription>
        <DocsBody>
          <article data-blog-slug={post.slug}>{post.content}</article>
        </DocsBody>
      </ModulePageProviders>
    </DocsPage>
  );
}
