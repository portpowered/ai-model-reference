import {
  HomeBrowseLink,
  HomeBrowseList,
} from "@/components/home/home-browse-link";
import { HomeBrushHeader } from "@/components/home/home-brush-header";
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

export function HomeArticle({
  messages,
  locale = defaultLocale,
}: HomeArticleProps) {
  const { home } = messages;

  return (
    <article className="max-w-3xl">
      <HomeBrushHeader title={home.title} subtitle={home.subtitle} />
      <p className="text-base leading-relaxed text-muted-foreground">
        {home.intro}
      </p>

      <section
        id="browse"
        className="mt-10 scroll-mt-6"
        aria-labelledby="home-browse-heading"
      >
        <h2
          id="home-browse-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {home.browseSectionTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {home.browseSectionDescription}
        </p>
        <HomeBrowseList ariaLabel={home.browseSectionTitle}>
          <HomeBrowseLink
            href={buildLocalizedRoute(
              { surface: "architecture-index" },
              locale,
            )}
            title={home.architectureLinkTitle}
            description={home.architectureLinkDescription}
          />
          <HomeBrowseLink
            href={buildLocalizedRoute({ surface: "glossary-index" }, locale)}
            title={home.glossaryLinkTitle}
            description={home.glossaryLinkDescription}
          />
          <HomeBrowseLink
            href={buildLocalizedRoute(
              { surface: "docs-page", slug: "glossary/token" },
              locale,
            )}
            title={home.tokenLinkTitle}
            description={home.tokenLinkDescription}
          />
          <HomeBrowseLink
            href={buildLocalizedRoute({ surface: "tags-index" }, locale)}
            title={home.tagsLinkTitle}
            description={home.tagsLinkDescription}
          />
          <HomeBrowseLink
            href={buildLocalizedRoute(
              { surface: "docs-page", slug: "modules/grouped-query-attention" },
              locale,
            )}
            title={home.docsLinkTitle}
            description={home.docsLinkDescription}
          />
        </HomeBrowseList>
      </section>
    </article>
  );
}
