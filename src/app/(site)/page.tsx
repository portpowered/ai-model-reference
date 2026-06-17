import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";

import { HomeArticle } from "@/components/home/home-article";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { buildHomeTableOfContents } from "@/lib/navigation/home-page-toc";

export async function renderHomePage(locale: SiteLocale = defaultLocale) {
  const messages = await loadUiMessages();
  const { home } = messages;

  return (
    <DocsPage
      toc={buildHomeTableOfContents(home)}
      breadcrumb={{ enabled: false }}
      footer={{ enabled: false }}
    >
      <DocsBody>
        <HomeArticle messages={messages} locale={locale} />
      </DocsBody>
    </DocsPage>
  );
}

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
