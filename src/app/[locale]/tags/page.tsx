import type { Metadata } from "next";
import { renderTagsIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../localized-shell-metadata";

type LocalizedTagsIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedTagsIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.tagsIndex.title,
    description: messages.tagsIndex.description,
    alternates: localizedRouteAlternates({ surface: "tags-index" }),
  };
}

export default async function LocalizedTagsIndexPage({
  params,
}: LocalizedTagsIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderTagsIndexPage(locale);
}
