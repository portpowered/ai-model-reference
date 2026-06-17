import type { Metadata } from "next";
import { renderSearchPage } from "@/app/(site)/search/page";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  localizedRouteAlternates,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedSearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.searchEntry.title,
    description: messages.searchEntry.description,
    alternates: localizedRouteAlternates({ surface: "search" }),
  };
}

export default async function LocalizedSearchPage({
  params,
  searchParams,
}: LocalizedSearchPageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderSearchPage(locale, { searchParams });
}
