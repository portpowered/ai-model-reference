import type { Metadata } from "next";
import { renderSectionCollectionIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedSystemsIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedSystemsIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.systemsIndex.title,
    description: messages.systemsIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "systems",
    }),
  };
}

export default async function LocalizedSystemsIndexPage({
  params,
}: LocalizedSystemsIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderSectionCollectionIndexPage("systems", locale);
}
