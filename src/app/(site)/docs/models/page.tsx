import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderSectionCollectionIndexPage } from "../../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.modelsIndex.title,
    description: messages.modelsIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "models",
    }),
  };
}

export default async function ModelsIndexPage() {
  return renderSectionCollectionIndexPage("models");
}
