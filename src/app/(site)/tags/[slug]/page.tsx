import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TagResourceList } from "@/features/docs/components/TagResourceList";
import { TagLandingEmptyState } from "@/features/docs/tags/TagLandingEmptyState";
import { TagSearchHandoff } from "@/features/docs/tags/TagSearchHandoff";
import {
  loadTagLandingContext,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import { loadPublishedTagIndexEntries } from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
  switchRouteLocale,
} from "@/lib/i18n/locale-routing";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";

type TagLandingPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const messages = await loadUiMessages();
  const entries = await loadPublishedTagIndexEntries(messages, "en");
  return entries.map((entry) => ({
    slug: entry.slug,
  }));
}

export async function renderTagLandingPage(
  { params }: TagLandingPageProps,
  locale: SiteLocale = defaultLocale,
) {
  const { slug } = await params;
  const messages = await loadUiMessages();
  const context = await loadTagLandingContext(slug, messages, defaultLocale);

  if (!context) {
    notFound();
  }

  const groups = (
    await loadTagResourceGroups(slug, messages, defaultLocale)
  ).map((group) => ({
    ...group,
    resources: group.resources.map((resource) => ({
      ...resource,
      url: switchRouteLocale(resource.url, locale),
    })),
  }));
  const { tagLanding } = messages;
  const searchQuery = context.slug;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{context.title}</DocsTitle>
      <DocsDescription>{context.summary}</DocsDescription>
      <DocsBody>
        <p className="text-sm text-muted-foreground">
          <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5">
            {context.categoryLabel}
          </span>
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <TagSearchHandoff
            messages={messages}
            tagSlug={slug}
            searchQuery={searchQuery}
            label={tagLanding.searchHandoff}
          />
          <Link
            href={`${buildLocalizedRoute({ surface: "search" }, locale)}?tag=${encodeURIComponent(slug)}`}
            className="inline-flex items-center rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-ring hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {tagLanding.searchEntryLink}
          </Link>
        </div>
        {groups.length === 0 ? (
          <TagLandingEmptyState
            messages={messages}
            tagSlug={slug}
            searchQuery={searchQuery}
            locale={locale}
          />
        ) : (
          <TagResourceList groups={groups} listLabel={tagLanding.listLabel} />
        )}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateMetadata({
  params,
}: TagLandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const messages = await loadUiMessages();
  const context = await loadTagLandingContext(slug, messages, defaultLocale);

  if (!context) {
    return {
      title: "Tag not found",
    };
  }

  return {
    title: context.title,
    description: context.summary,
    alternates: localizedRouteAlternates({ surface: "tag-page", slug }),
  };
}

export default async function TagLandingPage(props: TagLandingPageProps) {
  return renderTagLandingPage(props);
}
