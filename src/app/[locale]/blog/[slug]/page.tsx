import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderBlogPostPage } from "@/app/(site)/site-renderers";
import { blogPostHref, listBlogSlugs } from "@/lib/content/blog-page-load";
import { getPublishedBlogPostBySlug } from "@/lib/content/blog-post-get";
import { hasBlogPostMessagesForLocale } from "@/lib/content/blog-post-list";
import {
  generateStaticLocaleParams,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedBlogPostPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];

  for (const { locale } of generateStaticLocaleParams()) {
    for (const slug of listBlogSlugs()) {
      if (hasBlogPostMessagesForLocale(slug, locale)) {
        params.push({ locale, slug });
      }
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: LocalizedBlogPostPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);

  if (!hasBlogPostMessagesForLocale(slug, locale)) {
    notFound();
  }

  const published = await getPublishedBlogPostBySlug(slug, { locale });

  if (!published) {
    return {};
  }

  return {
    title: published.messages.title,
    description: published.messages.description,
    alternates: {
      canonical: blogPostHref(slug, locale),
    },
  };
}

export default async function LocalizedBlogPostPage({
  params,
}: LocalizedBlogPostPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);

  if (!hasBlogPostMessagesForLocale(slug, locale)) {
    notFound();
  }

  return renderBlogPostPage(slug, locale);
}
