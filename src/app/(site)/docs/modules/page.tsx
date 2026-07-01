import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderSectionCollectionIndexPage } from "../../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.modulesIndex.title,
    description: messages.modulesIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "modules",
    }),
  };
}

export default async function ModulesIndexPage() {
  return renderSectionCollectionIndexPage("modules");
}
