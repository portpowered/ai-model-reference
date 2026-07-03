import type { Metadata } from "next";
import { blogIndexHref } from "@/lib/content/blog-page-load";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { renderBlogIndexPage } from "../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.blogIndex.title,
    description: messages.blogIndex.description,
    alternates: {
      canonical: blogIndexHref(),
    },
  };
}

export default async function BlogIndexPage() {
  return renderBlogIndexPage();
}
