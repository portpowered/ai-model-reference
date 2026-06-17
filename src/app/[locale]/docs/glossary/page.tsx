import type { Metadata } from "next";
import { renderGlossaryIndexPage } from "@/app/(site)/docs/glossary/page";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  localizedRouteAlternates,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedGlossaryIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.glossaryIndex.title,
    description: messages.glossaryIndex.description,
    alternates: localizedRouteAlternates({ surface: "glossary-index" }),
  };
}

export default async function LocalizedGlossaryIndexPage({
  params,
}: LocalizedGlossaryIndexPageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderGlossaryIndexPage(locale);
}
