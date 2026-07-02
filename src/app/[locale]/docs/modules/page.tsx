import type { Metadata } from "next";
import { renderSectionCollectionIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedModulesIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedModulesIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.modulesIndex.title,
    description: messages.modulesIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "modules",
    }),
  };
}

export default async function LocalizedModulesIndexPage({
  params,
}: LocalizedModulesIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderSectionCollectionIndexPage("modules", locale);
}
