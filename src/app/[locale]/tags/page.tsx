import type { Metadata } from "next";
import { renderTagsIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  localizedRouteAlternates,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedTagsIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages("vi");

  return {
    title: messages.tagsIndex.title,
    description: messages.tagsIndex.description,
    alternates: localizedRouteAlternates({ surface: "tags-index" }),
  };
}

export default async function LocalizedTagsIndexPage({
  params,
}: LocalizedTagsIndexPageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderTagsIndexPage(locale);
}
