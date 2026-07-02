import type { Metadata } from "next";
import { renderTopologyPrototypePage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../localized-shell-metadata";

type LocalizedTopologyPrototypePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedTopologyPrototypePageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.topologyPrototype.title,
    description: messages.topologyPrototype.description,
    alternates: localizedRouteAlternates({ surface: "topology" }),
  };
}

export default async function LocalizedTopologyPrototypePage({
  params,
}: LocalizedTopologyPrototypePageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderTopologyPrototypePage(locale);
}
