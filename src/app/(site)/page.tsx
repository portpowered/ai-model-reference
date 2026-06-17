import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { renderHomePage } from "./site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.home.title,
    description: messages.home.intro,
    alternates: localizedRouteAlternates({ surface: "home" }),
  };
}

export default async function HomePage() {
  return renderHomePage();
}
