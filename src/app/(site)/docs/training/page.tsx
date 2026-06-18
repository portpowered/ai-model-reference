import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderSectionKindIndexPage } from "../../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.trainingIndex.title,
    description: messages.trainingIndex.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "training",
    }),
  };
}

export default async function TrainingIndexPage() {
  return renderSectionKindIndexPage("training-regime");
}
