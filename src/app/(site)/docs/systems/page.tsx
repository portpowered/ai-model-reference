import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderSectionKindIndexPage } from "../../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.systemsIndex.title,
    description: messages.systemsIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "systems",
    }),
  };
}

export default async function SystemsIndexPage() {
  return renderSectionKindIndexPage("system");
}
