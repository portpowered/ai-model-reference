import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { DocsIndexEmptyState } from "@/features/docs/components/DocsIndexEmptyState";
import { DocsIndexEntryList } from "@/features/docs/components/DocsIndexEntryList";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  defaultLocale,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";

export async function renderGlossaryIndexPage(
  locale: SiteLocale = defaultLocale,
) {
  const messages = await loadUiMessages();
  const entries = (await loadPublishedGlossaryEntries(defaultLocale)).map(
    (entry) => ({
      ...entry,
      url: switchRouteLocale(entry.url, locale),
    }),
  );
  const { glossaryIndex } = messages;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{glossaryIndex.title}</DocsTitle>
      <DocsDescription>{glossaryIndex.description}</DocsDescription>
      <DocsBody>
        {entries.length === 0 ? (
          <DocsIndexEmptyState
            title={glossaryIndex.emptyTitle}
            description={glossaryIndex.emptyDescription}
            homeLinkLabel={glossaryIndex.emptyHomeLink}
            messages={messages}
            locale={locale}
          />
        ) : (
          <DocsIndexEntryList
            entries={entries}
            listLabel={glossaryIndex.listLabel}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}

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
