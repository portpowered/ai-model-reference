import {
  HomeBrowseLink,
  HomeBrowseList,
} from "@/components/home/home-browse-link";
import { HomeBrushHeader } from "@/components/home/home-brush-header";
import { isDocsPageShippedForLocale } from "@/lib/content/pages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

type HomeArticleProps = {
  messages: UiMessages;
  locale?: SiteLocale;
};

function buildHomeDocsPageHref(docsSlug: string, locale: SiteLocale): string {
  const hrefLocale = isDocsPageShippedForLocale(docsSlug, locale)
    ? locale
    : defaultLocale;

  return buildLocalizedRoute(
    { surface: "docs-page", slug: docsSlug },
    hrefLocale,
  );
}

export function HomeArticle({
  messages,
  locale = defaultLocale,
}: HomeArticleProps) {
  const { home } = messages;

  return (
    <article className="max-w-3xl">
      <HomeBrushHeader title={home.title} subtitle={home.subtitle} />

      <section
        id="browse"
        className="mt-4 scroll-mt-6"
        aria-labelledby="home-browse-heading"
      >
        <h2
          id="home-browse-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {home.browseSectionTitle}
        </h2>
        <HomeBrowseList ariaLabel={home.browseSectionTitle}>
          <HomeBrowseLink
            href={buildLocalizedRoute({ surface: "browse" }, locale)}
            title={home.atlasLinkTitle}
            description={home.atlasLinkDescription}
          />
          <HomeBrowseLink
            href={buildHomeDocsPageHref(
              "modules/grouped-query-attention",
              locale,
            )}
            title={home.gqaLinkTitle}
            description={home.gqaLinkDescription}
          />
          <HomeBrowseLink
            href={buildHomeDocsPageHref("modules/swiglu", locale)}
            title={home.swigluLinkTitle}
            description={home.swigluLinkDescription}
          />
          <HomeBrowseLink
            href={buildHomeDocsPageHref("modules/relu", locale)}
            title={home.reluLinkTitle}
            description={home.reluLinkDescription}
          />
        </HomeBrowseList>
      </section>
    </article>
  );
}
