import type { Metadata } from "next";
import {
  generateMetadata as generateEnglishMetadata,
  renderTagLandingPage,
} from "@/app/(site)/tags/[slug]/page";
import { resolveRouteLocaleOrNotFound } from "@/lib/i18n/route-locale";

type LocalizedTagLandingPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedTagLandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateEnglishMetadata({ params: Promise.resolve({ slug }) });
}

export default async function LocalizedTagLandingPage({
  params,
}: LocalizedTagLandingPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderTagLandingPage({ params: Promise.resolve({ slug }) }, locale);
}
