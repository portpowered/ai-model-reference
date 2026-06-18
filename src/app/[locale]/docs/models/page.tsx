import type { Metadata } from "next";
import { renderSectionKindIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedModelsIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedModelsIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.modelsIndex.title,
    description: messages.modelsIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "models",
    }),
  };
}

export default async function LocalizedModelsIndexPage({
  params,
}: LocalizedModelsIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderSectionKindIndexPage("model", locale);
}
