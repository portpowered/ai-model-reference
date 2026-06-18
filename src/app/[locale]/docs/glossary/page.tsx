import type { Metadata } from "next";
import { renderGlossaryIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedGlossaryIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedGlossaryIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.glossaryIndex.title,
    description: messages.glossaryIndex.description,
    alternates: localizedRouteAlternates({ surface: "glossary-index" }),
  };
}

export default async function LocalizedGlossaryIndexPage({
  params,
}: LocalizedGlossaryIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderGlossaryIndexPage(locale);
}
