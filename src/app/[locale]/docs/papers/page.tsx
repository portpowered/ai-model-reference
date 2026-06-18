import type { Metadata } from "next";
import { renderSectionKindIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedPapersIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedPapersIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.papersIndex.title,
    description: messages.papersIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "papers",
    }),
  };
}

export default async function LocalizedPapersIndexPage({
  params,
}: LocalizedPapersIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderSectionKindIndexPage("paper", locale);
}
