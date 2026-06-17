import type { Metadata } from "next";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import {
  generateStaticLocaleParams,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedDocsSlugPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

export async function generateStaticParams() {
  const params: Array<{ locale: string; slug?: string[] }> = [];

  for (const { locale } of generateStaticLocaleParams()) {
    const pages = await loadShippedLocalizedDocsPages(locale);
    for (const page of pages) {
      params.push({
        locale,
        slug: page.docsSlug.split("/"),
      });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: LocalizedDocsSlugPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return buildDocsPageMetadata(slug, locale);
}

export default async function LocalizedDocsSlugPage({
  params,
}: LocalizedDocsSlugPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderDocsSlugPage(slug, locale);
}
