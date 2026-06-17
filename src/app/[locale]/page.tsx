import type { Metadata } from "next";
import { renderHomePage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  localizedRouteAlternates,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedHomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages("vi");

  return {
    title: messages.home.title,
    description: messages.home.intro,
    alternates: localizedRouteAlternates({ surface: "home" }),
  };
}

export default async function LocalizedHomePage({
  params,
}: LocalizedHomePageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderHomePage(locale);
}
