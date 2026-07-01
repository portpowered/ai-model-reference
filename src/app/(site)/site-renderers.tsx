import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HomeArticle } from "@/components/home/home-article";
import { BrowseAtlasPage } from "@/features/docs/components/BrowseAtlasPage";
import { DocsIndexEmptyState } from "@/features/docs/components/DocsIndexEmptyState";
import { DocsIndexEntryList } from "@/features/docs/components/DocsIndexEntryList";
import { StaticExportBrowsePage } from "@/features/docs/components/StaticExportBrowsePage";
import { TagResourceList } from "@/features/docs/components/TagResourceList";
import {
  TopologyBrowsePage,
  topologyBrowseDescription,
  topologyBrowseTitle,
} from "@/features/docs/components/TopologyBrowsePage";
import { SearchPagePanelContent } from "@/features/docs/search/SearchPagePanel";
import {
  EMPTY_SEARCH_PAGE_HANDOFF,
  resolveSearchPageHandoff,
} from "@/features/docs/search/search-page-query";
import { TagLandingEmptyState } from "@/features/docs/tags/TagLandingEmptyState";
import { TagSearchHandoff } from "@/features/docs/tags/TagSearchHandoff";
import { TagsIndexList } from "@/features/docs/tags/TagsIndexList";
import { OntologyTimelinePage } from "@/features/docs/timeline/OntologyTimelinePage";
import { TopologyPrototype } from "@/features/topology/TopologyPrototype";
import type { TopologyDocsPageContentByRegistryId } from "@/features/topology/topology-content";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import {
  loadPublishedDocsPages,
  loadShippedLocalizedDocsPages,
} from "@/lib/content/pages";
import {
  loadTagLandingContext,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import {
  loadPublishedTagIndexEntries,
  loadPublishedTagIndexGroups,
} from "@/lib/content/tags";
import {
  resolveTopologyBrowseState,
  type TopologySearchParams,
} from "@/lib/content/topology-browse";
import {
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
} from "@/lib/content/topology-navigation";
import {
  buildTopologyTreeEntries,
  type TopologyClassificationEntry,
} from "@/lib/content/topology-tree-entries";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildBrowseCollectionSections } from "@/lib/docs/browse-collection-sections";
import { toDocsIndexEntries } from "@/lib/docs/docs-index-entries";
import {
  buildLocalizedRoute,
  defaultLocale,
  type LocalizedRouteDestination,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { buildHomeTableOfContents } from "@/lib/navigation/home-page-toc";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { modelAtlasSiteConfig } from "@/lib/site/model-atlas-site-config";

export type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export type BrowseIndexPageProps = {
  searchParams?: Promise<TopologySearchParams>;
};
export type TimelinePageProps = SearchPageProps;

export type TagLandingPageProps = {
  params: Promise<{ slug: string }>;
};

export async function renderHomePage(locale: SiteLocale = defaultLocale) {
  const messages = await loadUiMessages(locale);
  const { home } = messages;

  return (
    <DocsPage
      toc={buildHomeTableOfContents(home)}
      breadcrumb={{ enabled: false }}
      footer={{ enabled: false }}
    >
      <DocsBody>
        <HomeArticle
          messages={messages}
          siteConfig={modelAtlasSiteConfig}
          locale={locale}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function renderBrowseIndexPage(
  locale: SiteLocale = defaultLocale,
  { searchParams }: BrowseIndexPageProps = {},
) {
  const messages = await loadUiMessages(locale);
  const pages = await loadShippedLocalizedDocsPages(locale);
  const canonicalPages =
    locale === defaultLocale
      ? pages
      : await loadPublishedDocsPages(defaultLocale);
  const topologyLabels = getTopologyNavigationLabels(messages);
  const topologyOptions = listTopologyNavigationOptions({
    locale,
    labels: topologyLabels,
  });
  const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";
  const browseSections = buildBrowseCollectionSections({
    pages,
    locale,
    messages,
  });
  const defaultPage = (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{messages.browseIndex.title}</DocsTitle>
      <DocsDescription>{messages.browseIndex.description}</DocsDescription>
      <DocsBody>
        <BrowseAtlasPage
          messages={messages}
          locale={locale}
          sections={browseSections}
        />
      </DocsBody>
    </DocsPage>
  );

  if (isStaticExport) {
    const treeByClassificationSlug = Object.fromEntries(
      topologyOptions.map((option) => [
        option.classificationSlug,
        buildTopologyTreeEntries({
          tree: option.tree,
          localizedPages: pages,
          canonicalPages,
          locale,
          topologyLabels,
        }),
      ]),
    ) as Record<string, TopologyClassificationEntry[]>;

    return (
      <Suspense fallback={defaultPage}>
        <StaticExportBrowsePage
          messages={messages}
          options={topologyOptions}
          treeByClassificationSlug={treeByClassificationSlug}
          defaultPage={defaultPage}
        />
      </Suspense>
    );
  }

  const topologyState = resolveTopologyBrowseState(
    await searchParams,
    topologyOptions,
  );

  if (topologyState.kind !== "not-requested") {
    const topologyTree =
      topologyState.kind === "selected"
        ? buildTopologyTreeEntries({
            tree: topologyState.option.tree,
            localizedPages: pages,
            canonicalPages,
            locale,
            topologyLabels,
          })
        : [];

    return (
      <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
        <DocsTitle>{topologyBrowseTitle(messages, topologyState)}</DocsTitle>
        <DocsDescription>
          {topologyBrowseDescription(messages, topologyState)}
        </DocsDescription>
        <DocsBody>
          <TopologyBrowsePage
            messages={messages}
            state={topologyState}
            tree={topologyTree}
          />
        </DocsBody>
      </DocsPage>
    );
  }

  return defaultPage;
}

export async function renderSectionKindIndexPage(
  kind: "model" | "module" | "concept" | "paper" | "training-regime" | "system",
  locale: SiteLocale = defaultLocale,
) {
  const messages = await loadUiMessages(locale);
  const pages = await loadShippedLocalizedDocsPages(locale);
  const sectionMessages =
    kind === "model"
      ? messages.modelsIndex
      : kind === "module"
        ? messages.modulesIndex
        : kind === "concept"
          ? messages.conceptsIndex
          : kind === "paper"
            ? messages.papersIndex
            : kind === "training-regime"
              ? messages.trainingIndex
              : messages.systemsIndex;
  const entries = toDocsIndexEntries(
    pages.filter((page) => page.frontmatter.kind === kind),
    locale,
    [],
    Number.POSITIVE_INFINITY,
  );

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{sectionMessages.title}</DocsTitle>
      <DocsDescription>{sectionMessages.description}</DocsDescription>
      <DocsBody>
        {entries.length === 0 ? (
          <DocsIndexEmptyState
            title={sectionMessages.emptyTitle}
            description={sectionMessages.emptyDescription}
            homeLinkLabel={sectionMessages.emptyHomeLink}
            messages={messages}
            locale={locale}
          />
        ) : (
          <DocsIndexEntryList
            entries={entries}
            listLabel={sectionMessages.listLabel}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}

export async function renderSearchPage(
  locale: SiteLocale = defaultLocale,
  { searchParams }: SearchPageProps = {},
) {
  const messages = await loadUiMessages(locale);
  const metaByUrl = searchResultMetaMapToRecord(
    await loadSearchResultMetaMap(locale),
  );
  const { searchEntry } = messages;
  const handoff =
    process.env.NEXT_STATIC_EXPORT === "1"
      ? EMPTY_SEARCH_PAGE_HANDOFF
      : resolveSearchPageHandoff(await searchParams);

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{searchEntry.title}</DocsTitle>
      <DocsDescription>{searchEntry.description}</DocsDescription>
      <DocsBody>
        <p className="text-sm text-muted-foreground">
          {searchEntry.canonicalNote}
        </p>
        <SearchPagePanelContent
          messages={messages}
          metaByUrl={metaByUrl}
          handoff={handoff}
          locale={locale}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function renderTimelinePage(
  locale: SiteLocale = defaultLocale,
  _props: TimelinePageProps = {},
) {
  const messages = await loadUiMessages(locale);
  const { timelinePage } = messages;

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{timelinePage.title}</DocsTitle>
      <DocsDescription>{timelinePage.description}</DocsDescription>
      <DocsBody>
        <OntologyTimelinePage locale={locale} messages={messages} />
      </DocsBody>
    </DocsPage>
  );
}

export async function renderArchitectureIndexPage(
  locale: SiteLocale = defaultLocale,
) {
  const messages = await loadUiMessages(locale);
  const entries = await loadPublishedArchitectureEntries(locale);
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

export async function renderTopologyPrototypePage(
  locale: SiteLocale = defaultLocale,
) {
  const messages = await loadUiMessages(locale);
  const docsPages = await loadShippedLocalizedDocsPages(locale);
  const { topologyPrototype } = messages;
  const docsPageContentByRegistryId: TopologyDocsPageContentByRegistryId =
    Object.fromEntries(
      docsPages.map((page) => [
        page.frontmatter.registryId,
        {
          href: page.url,
          summary: page.messages.description,
          title: page.messages.title,
        },
      ]),
    );

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{topologyPrototype.title}</DocsTitle>
      <DocsBody>
        <Suspense
          fallback={
            <TopologyPrototypeLoadingFallback
              title={topologyPrototype.loadingTitle}
              description={topologyPrototype.loadingDescription}
            />
          }
        >
          <TopologyPrototype
            messages={messages}
            docsPageContentByRegistryId={docsPageContentByRegistryId}
          />
        </Suspense>
      </DocsBody>
    </DocsPage>
  );
}

function TopologyPrototypeLoadingFallback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-6" aria-labelledby="topology-success-title">
      <div className="grid gap-3 md:grid-cols-3">
        <article
          className="rounded-lg border border-border bg-muted/20 p-4"
          aria-labelledby="topology-loading-title"
        >
          <h2
            id="topology-loading-title"
            className="text-sm font-semibold text-foreground"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </article>
      </div>
    </section>
  );
}

export async function renderGlossaryIndexPage(
  locale: SiteLocale = defaultLocale,
) {
  const messages = await loadUiMessages(locale);
  const entries = await loadPublishedGlossaryEntries(locale);
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

export async function renderTagsIndexPage(locale: SiteLocale = defaultLocale) {
  const messages = await loadUiMessages(locale);
  const groups = await loadPublishedTagIndexGroups(messages, locale);
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

export async function renderTagLandingPage(
  { params }: TagLandingPageProps,
  locale: SiteLocale = defaultLocale,
) {
  const { slug } = await params;
  const messages = await loadUiMessages(locale);
  const context = await loadTagLandingContext(slug, messages, locale);

  if (!context) {
    notFound();
  }

  const groups = await loadTagResourceGroups(slug, messages, locale);
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

export async function buildTagLandingMetadata(
  slug: string,
  locale: SiteLocale = defaultLocale,
) {
  const messages = await loadUiMessages(locale);
  const context = await loadTagLandingContext(slug, messages, locale);

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

export async function buildStaticSurfaceMetadata(
  destination: LocalizedRouteDestination,
  {
    title,
    description,
  }: {
    title: string;
    description: string;
  },
) {
  return {
    title,
    description,
    alternates: localizedRouteAlternates(destination),
  };
}

export async function generateTagLandingStaticParams() {
  const messages = await loadUiMessages();
  const entries = await loadPublishedTagIndexEntries(messages, "en");
  return entries.map((entry) => ({
    slug: entry.slug,
  }));
}
