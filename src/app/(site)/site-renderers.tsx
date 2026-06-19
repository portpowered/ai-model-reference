import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeArticle } from "@/components/home/home-article";
import { BrowseAtlasPage } from "@/features/docs/components/BrowseAtlasPage";
import { DocsIndexEmptyState } from "@/features/docs/components/DocsIndexEmptyState";
import type { DocsIndexEntry } from "@/features/docs/components/DocsIndexEntryList";
import { DocsIndexEntryList } from "@/features/docs/components/DocsIndexEntryList";
import { TagResourceList } from "@/features/docs/components/TagResourceList";
import { SearchPagePanelContent } from "@/features/docs/search/SearchPagePanel";
import {
  EMPTY_SEARCH_PAGE_HANDOFF,
  resolveSearchPageHandoff,
} from "@/features/docs/search/search-page-query";
import { TagLandingEmptyState } from "@/features/docs/tags/TagLandingEmptyState";
import { TagSearchHandoff } from "@/features/docs/tags/TagSearchHandoff";
import { TagsIndexList } from "@/features/docs/tags/TagsIndexList";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import {
  loadTagLandingContext,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import {
  loadPublishedTagIndexEntries,
  loadPublishedTagIndexGroups,
} from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";
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

export type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export type TagLandingPageProps = {
  params: Promise<{ slug: string }>;
};

function toDocsIndexEntries(
  pages: Array<{
    docsSlug: string;
    url: string;
    messages: { title: string; description: string };
  }>,
  locale: SiteLocale,
  preferredSlugs: string[] = [],
  limit = 6,
): DocsIndexEntry[] {
  const sortedPages = [...pages].sort((left, right) =>
    left.messages.title.localeCompare(right.messages.title, locale, {
      sensitivity: "base",
    }),
  );
  const pagesBySlug = new Map(sortedPages.map((page) => [page.docsSlug, page]));
  const preferredPages = preferredSlugs
    .map((slug) => pagesBySlug.get(slug))
    .filter((page): page is (typeof sortedPages)[number] => Boolean(page));
  const remainingPages = sortedPages.filter(
    (page) => !preferredSlugs.includes(page.docsSlug),
  );

  return [...preferredPages, ...remainingPages].slice(0, limit).map((page) => ({
    slug: page.docsSlug,
    title: page.messages.title,
    summary: page.messages.description,
    url: page.url,
  }));
}

const BROWSE_MODELS_STARTER_SLUGS = ["models/gpt-3"] as const;
const BROWSE_MODULES_STARTER_SLUGS = [
  "modules/grouped-query-attention",
  "modules/attention",
  "modules/swiglu",
  "modules/relu",
  "modules/multi-head-attention",
  "modules/feed-forward-network",
] as const;
const BROWSE_CONCEPTS_STARTER_SLUGS = [
  "concepts/transformer-architecture",
  "concepts/positional-encodings",
  "concepts/context-extension",
  "concepts/quantization",
  "concepts/why-long-context-is-hard",
  "concepts/kv-cache-quantization",
] as const;
const BROWSE_PAPERS_STARTER_SLUGS = ["papers/deepseek-v4"] as const;
const BROWSE_TRAINING_STARTER_SLUGS = [
  "training/on-policy-distillation",
  "training/specialist-training",
  "training/fp4-quantization-aware-training",
  "training/ppo",
] as const;
const BROWSE_SYSTEMS_STARTER_SLUGS = [
  "systems/on-disk-kv-cache",
  "systems/expert-parallel-overlap",
] as const;
const BROWSE_GLOSSARY_STARTER_SLUGS = [
  "glossary/token",
  "glossary/embedding",
  "glossary/logit",
  "glossary/softmax",
  "glossary/kv-cache",
  "glossary/architecture",
] as const;

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
        <HomeArticle messages={messages} locale={locale} />
      </DocsBody>
    </DocsPage>
  );
}

export async function renderBrowseIndexPage(
  locale: SiteLocale = defaultLocale,
) {
  const messages = await loadUiMessages(locale);
  const pages = await loadShippedLocalizedDocsPages(locale);

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{messages.browseIndex.title}</DocsTitle>
      <DocsDescription>{messages.browseIndex.description}</DocsDescription>
      <DocsBody>
        <BrowseAtlasPage
          messages={messages}
          locale={locale}
          models={toDocsIndexEntries(
            pages.filter((page) => page.frontmatter.kind === "model"),
            locale,
            [...BROWSE_MODELS_STARTER_SLUGS],
          )}
          modules={toDocsIndexEntries(
            pages.filter((page) => page.frontmatter.kind === "module"),
            locale,
            [...BROWSE_MODULES_STARTER_SLUGS],
          )}
          concepts={toDocsIndexEntries(
            pages.filter((page) => page.frontmatter.kind === "concept"),
            locale,
            [...BROWSE_CONCEPTS_STARTER_SLUGS],
          )}
          papers={toDocsIndexEntries(
            pages.filter((page) => page.frontmatter.kind === "paper"),
            locale,
            [...BROWSE_PAPERS_STARTER_SLUGS],
          )}
          training={toDocsIndexEntries(
            pages.filter((page) => page.frontmatter.kind === "training-regime"),
            locale,
            [...BROWSE_TRAINING_STARTER_SLUGS],
          )}
          systems={toDocsIndexEntries(
            pages.filter((page) => page.frontmatter.kind === "system"),
            locale,
            [...BROWSE_SYSTEMS_STARTER_SLUGS],
          )}
          glossary={toDocsIndexEntries(
            pages.filter((page) => page.frontmatter.kind === "glossary"),
            locale,
            [...BROWSE_GLOSSARY_STARTER_SLUGS],
          )}
        />
      </DocsBody>
    </DocsPage>
  );
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
