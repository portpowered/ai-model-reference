import type { Metadata } from "next";
import { renderArchitectureIndexPage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  localizedRouteAlternates,
  resolveRouteLocaleOrNotFound,
} from "@/lib/i18n/route-locale";

type LocalizedArchitectureIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages("vi");

  return {
    title: messages.architectureIndex.title,
    description: messages.architectureIndex.description,
    alternates: localizedRouteAlternates({ surface: "architecture-index" }),
  };
}

export default async function LocalizedArchitectureIndexPage({
  params,
}: LocalizedArchitectureIndexPageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  return renderArchitectureIndexPage(locale);
}
