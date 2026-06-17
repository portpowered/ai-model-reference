import type { Metadata } from "next";
import {
  default as DocsSlugPage,
  generateMetadata as generateEnglishMetadata,
} from "@/app/docs/[[...slug]]/page";
import { resolveRouteLocaleOrNotFound } from "@/lib/i18n/route-locale";

type LocalizedDocsSlugPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

export async function generateMetadata({
  params,
}: LocalizedDocsSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateEnglishMetadata({ params: Promise.resolve({ slug }) });
}

export default async function LocalizedDocsSlugPage({
  params,
}: LocalizedDocsSlugPageProps) {
  const { locale: rawLocale, slug } = await params;
  resolveRouteLocaleOrNotFound(rawLocale);
  return DocsSlugPage({ params: Promise.resolve({ slug }) });
}
