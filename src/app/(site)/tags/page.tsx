import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderTagsIndexPage } from "../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.tagsIndex.title,
    description: messages.tagsIndex.description,
    alternates: localizedRouteAlternates({ surface: "tags-index" }),
  };
}

export default async function TagsIndexPage() {
  return renderTagsIndexPage();
}
