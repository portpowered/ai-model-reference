import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderSectionCollectionIndexPage } from "../../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.conceptsIndex.title,
    description: messages.conceptsIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "concepts",
    }),
  };
}

export default async function ConceptsIndexPage() {
  return renderSectionCollectionIndexPage("concepts");
}
