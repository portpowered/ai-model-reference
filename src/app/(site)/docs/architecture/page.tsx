import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderArchitectureIndexPage } from "../../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.architectureIndex.title,
    description: messages.architectureIndex.description,
    alternates: localizedRouteAlternates({ surface: "architecture-index" }),
  };
}

export default async function ArchitectureIndexPage() {
  return renderArchitectureIndexPage();
}
