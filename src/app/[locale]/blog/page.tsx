import type { Metadata } from "next";
import { renderBlogIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  localizedRouteAlternates,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedBlogIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedBlogIndexPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.blogIndex.title,
    description: messages.blogIndex.description,
    alternates: localizedRouteAlternates({ surface: "blog-index" }),
  };
}

export default async function LocalizedBlogIndexPage({
  params,
}: LocalizedBlogIndexPageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderBlogIndexPage(locale);
}
