import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderGlossaryIndexPage } from "../../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.glossaryIndex.title,
    description: messages.glossaryIndex.description,
    alternates: localizedRouteAlternates({ surface: "glossary-index" }),
  };
}

export default async function GlossaryIndexPage() {
  return renderGlossaryIndexPage();
}
