import type { Metadata } from "next";
import { renderArchitectureIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedArchitectureIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedArchitectureIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.architectureIndex.title,
    description: messages.architectureIndex.description,
    alternates: localizedRouteAlternates({ surface: "architecture-index" }),
  };
}

export default async function LocalizedArchitectureIndexPage({
  params,
}: LocalizedArchitectureIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderArchitectureIndexPage(locale);
}
