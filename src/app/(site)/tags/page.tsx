import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { TagsIndexList } from "@/features/docs/tags/TagsIndexList";
import { loadPublishedTagIndexGroups } from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  defaultLocale,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";

export async function renderTagsIndexPage(locale: SiteLocale = defaultLocale) {
  const messages = await loadUiMessages();
  const groups = (
    await loadPublishedTagIndexGroups(messages, defaultLocale)
  ).map((group) => ({
    ...group,
    tags: group.tags.map((tag) => ({
      ...tag,
      url: switchRouteLocale(tag.url, locale),
    })),
  }));
  const { tagsIndex } = messages;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{tagsIndex.title}</DocsTitle>
      <DocsDescription>{tagsIndex.description}</DocsDescription>
      <DocsBody>
        <TagsIndexList groups={groups} listLabel={tagsIndex.listLabel} />
      </DocsBody>
    </DocsPage>
  );
}

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
