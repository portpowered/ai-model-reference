import Link from "next/link";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import { type DocsIndexEntry, DocsIndexEntryList } from "./DocsIndexEntryList";
import {
  bulletlessListClassName,
  docsResourceCardLinkClassName,
} from "./list-decoration";

type BrowseAtlasPageProps = {
  messages: UiMessages;
  locale?: SiteLocale;
  models: DocsIndexEntry[];
  modules: DocsIndexEntry[];
  concepts: DocsIndexEntry[];
  papers: DocsIndexEntry[];
  training: DocsIndexEntry[];
  systems: DocsIndexEntry[];
  glossary: DocsIndexEntry[];
};

type BrowseRouteCard = {
  href: string;
  title: string;
  description: string;
};

function BrowseRouteCardList({
  cards,
  label,
}: {
  cards: BrowseRouteCard[];
  label: string;
}) {
  return (
    <ul className={bulletlessListClassName("mt-4")} aria-label={label}>
      {cards.map((card) => (
        <li key={card.href}>
          <Link href={card.href} className={docsResourceCardLinkClassName}>
            <span className="font-medium text-foreground">{card.title}</span>
            <p className="mt-1 text-sm text-muted-foreground">
              {card.description}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BrowseSection({
  id,
  title,
  description,
  entries,
  linkLabel,
  linkHref,
}: {
  id: string;
  title: string;
  description: string;
  entries: DocsIndexEntry[];
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <section
      id={id}
      className="mt-10 scroll-mt-6"
      aria-labelledby={`${id}-heading`}
    >
      <h2
        id={`${id}-heading`}
        className="font-serif text-2xl font-semibold text-foreground"
      >
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {description}
      </p>
      <DocsIndexEntryList entries={entries} listLabel={title} />
      {linkHref && linkLabel ? (
        <p className="mt-4">
          <Link
            href={linkHref}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {linkLabel}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

export function BrowseAtlasPage({
  messages,
  locale = defaultLocale,
  models,
  modules,
  concepts,
  papers,
  training,
  systems,
  glossary,
}: BrowseAtlasPageProps) {
  const {
    browseIndex,
    searchEntry,
    glossaryIndex,
    architectureIndex,
    tagsIndex,
  } = messages;
  const quickRoutes: BrowseRouteCard[] = [
    {
      href: buildLocalizedRoute({ surface: "search" }, locale),
      title: searchEntry.title,
      description: browseIndex.searchRouteDescription,
    },
    {
      href: buildLocalizedRoute({ surface: "glossary-index" }, locale),
      title: glossaryIndex.title,
      description: browseIndex.glossaryRouteDescription,
    },
    {
      href: buildLocalizedRoute({ surface: "architecture-index" }, locale),
      title: architectureIndex.title,
      description: browseIndex.architectureRouteDescription,
    },
    {
      href: buildLocalizedRoute({ surface: "tags-index" }, locale),
      title: tagsIndex.title,
      description: browseIndex.tagsRouteDescription,
    },
  ];

  return (
    <>
      <section
        id="quick-routes"
        className="scroll-mt-6"
        aria-labelledby="browse-quick-routes-heading"
      >
        <h2
          id="browse-quick-routes-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {browseIndex.quickRoutesTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {browseIndex.quickRoutesDescription}
        </p>
        <BrowseRouteCardList
          cards={quickRoutes}
          label={browseIndex.quickRoutesTitle}
        />
      </section>

      <BrowseSection
        id="models"
        title={browseIndex.modelsSectionTitle}
        description={browseIndex.modelsSectionDescription}
        entries={models}
        linkHref={buildLocalizedRoute(
          { surface: "docs-page", slug: "models" },
          locale,
        )}
        linkLabel={browseIndex.modelsSectionLinkLabel}
      />
      <BrowseSection
        id="modules"
        title={browseIndex.modulesSectionTitle}
        description={browseIndex.modulesSectionDescription}
        entries={modules}
        linkHref={buildLocalizedRoute(
          { surface: "docs-page", slug: "modules" },
          locale,
        )}
        linkLabel={browseIndex.modulesSectionLinkLabel}
      />
      <BrowseSection
        id="concepts"
        title={browseIndex.conceptsSectionTitle}
        description={browseIndex.conceptsSectionDescription}
        entries={concepts}
        linkHref={buildLocalizedRoute(
          { surface: "docs-page", slug: "concepts" },
          locale,
        )}
        linkLabel={browseIndex.conceptsSectionLinkLabel}
      />
      <BrowseSection
        id="papers"
        title={browseIndex.papersSectionTitle}
        description={browseIndex.papersSectionDescription}
        entries={papers}
        linkHref={buildLocalizedRoute(
          { surface: "docs-page", slug: "papers" },
          locale,
        )}
        linkLabel={browseIndex.papersSectionLinkLabel}
      />
      <BrowseSection
        id="training"
        title={browseIndex.trainingSectionTitle}
        description={browseIndex.trainingSectionDescription}
        entries={training}
        linkHref={buildLocalizedRoute(
          { surface: "docs-page", slug: "training" },
          locale,
        )}
        linkLabel={browseIndex.trainingSectionLinkLabel}
      />
      <BrowseSection
        id="systems"
        title={browseIndex.systemsSectionTitle}
        description={browseIndex.systemsSectionDescription}
        entries={systems}
        linkHref={buildLocalizedRoute(
          { surface: "docs-page", slug: "systems" },
          locale,
        )}
        linkLabel={browseIndex.systemsSectionLinkLabel}
      />
      <BrowseSection
        id="glossary"
        title={browseIndex.glossarySectionTitle}
        description={browseIndex.glossarySectionDescription}
        entries={glossary}
        linkHref={buildLocalizedRoute({ surface: "glossary-index" }, locale)}
        linkLabel={browseIndex.glossarySectionLinkLabel}
      />
    </>
  );
}
