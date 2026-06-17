import type { Metadata } from "next";
import {
  buildTagLandingMetadata,
  generateTagLandingStaticParams,
  renderTagLandingPage,
} from "@/app/(site)/site-renderers";
import {
  localizeStaticParams,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedTagLandingPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  return localizeStaticParams(await generateTagLandingStaticParams());
}

export async function generateMetadata({
  params,
}: LocalizedTagLandingPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return buildTagLandingMetadata(slug, locale);
}

export default async function LocalizedTagLandingPage({
  params,
}: LocalizedTagLandingPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderTagLandingPage({ params: Promise.resolve({ slug }) }, locale);
}
