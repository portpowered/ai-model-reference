import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { DocsIndexEmptyState } from "@/features/docs/components/DocsIndexEmptyState";
import { DocsIndexEntryList } from "@/features/docs/components/DocsIndexEntryList";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  defaultLocale,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";

export async function renderArchitectureIndexPage(
  locale: SiteLocale = defaultLocale,
) {
  const messages = await loadUiMessages();
  const entries = (await loadPublishedArchitectureEntries(defaultLocale)).map(
    (entry) => ({
      ...entry,
      url: switchRouteLocale(entry.url, locale),
    }),
  );
  const { architectureIndex } = messages;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{architectureIndex.title}</DocsTitle>
      <DocsDescription>{architectureIndex.description}</DocsDescription>
      <DocsBody>
        {entries.length === 0 ? (
          <DocsIndexEmptyState
            title={architectureIndex.emptyTitle}
            description={architectureIndex.emptyDescription}
            homeLinkLabel={architectureIndex.emptyHomeLink}
            messages={messages}
            locale={locale}
          />
        ) : (
          <DocsIndexEntryList
            entries={entries}
            listLabel={architectureIndex.listLabel}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}

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
