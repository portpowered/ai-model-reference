import type { Metadata } from "next";
import { renderSectionCollectionIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedConceptsIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedConceptsIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.conceptsIndex.title,
    description: messages.conceptsIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "concepts",
    }),
  };
}

export default async function LocalizedConceptsIndexPage({
  params,
}: LocalizedConceptsIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderSectionCollectionIndexPage("concepts", locale);
}
