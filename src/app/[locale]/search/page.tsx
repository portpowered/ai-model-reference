import type { Metadata } from "next";
import { renderSearchPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../localized-shell-metadata";

type LocalizedSearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: LocalizedSearchPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

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
  const locale = await resolveMetadataLocale(params);
  return renderSearchPage(locale, { searchParams });
}
