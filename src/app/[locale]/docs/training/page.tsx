import type { Metadata } from "next";
import { renderSectionCollectionIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedTrainingIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedTrainingIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.trainingIndex.title,
    description: messages.trainingIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "training",
    }),
  };
}

export default async function LocalizedTrainingIndexPage({
  params,
}: LocalizedTrainingIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderSectionCollectionIndexPage("training", locale);
}
