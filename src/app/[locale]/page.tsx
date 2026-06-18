import type { Metadata } from "next";
import { renderHomePage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "./localized-shell-metadata";

type LocalizedHomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedHomePageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.home.title,
    description: messages.home.intro,
    alternates: localizedRouteAlternates({ surface: "home" }),
  };
}

export default async function LocalizedHomePage({
  params,
}: LocalizedHomePageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderHomePage(locale);
}
