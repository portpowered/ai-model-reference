import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { renderShellSectionCollectionIndexPage } from "@/app/(site)/site-renderers";
import { BrowseCollectionSectionList } from "@/features/docs/components/BrowseAtlasPage";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildBrowseCollectionSections } from "@/lib/docs/browse-collection-sections";
import { defaultLocale } from "@/lib/i18n/locale-routing";
import {
  getNonAiShellFixtureCollectionDefinition,
  listNonAiShellFixtureCollectionDefinitions,
  listNonAiShellFixturePages,
  loadNonAiShellFixtureMessages,
  NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS,
  NON_AI_SHELL_FIXTURE_URL_PREFIX,
  type NonAiShellFixtureCollectionId,
} from "./fixture";

function resolveNonAiShellFixtureBrowseSectionLinkHref(definition: {
  routeSlug: string;
}): string {
  return `${NON_AI_SHELL_FIXTURE_URL_PREFIX}/${definition.routeSlug}`;
}

export function renderNonAiShellFixtureBrowsePage() {
  const messages = loadNonAiShellFixtureMessages();
  const sections = buildBrowseCollectionSections({
    pages: listNonAiShellFixturePages(),
    locale: defaultLocale,
    messages,
    definitions: listNonAiShellFixtureCollectionDefinitions(),
    browseCollectionIds: NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS,
    resolveSectionLinkHref: (definition) =>
      resolveNonAiShellFixtureBrowseSectionLinkHref(definition),
  });

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>Fixture browse</DocsTitle>
      <DocsDescription>
        Test-owned browse output for non-AI shell collections.
      </DocsDescription>
      <DocsBody>
        <BrowseCollectionSectionList sections={sections} />
      </DocsBody>
    </DocsPage>
  );
}

export async function renderNonAiShellFixtureSectionIndexPage(
  collectionId: NonAiShellFixtureCollectionId,
) {
  const definition = getNonAiShellFixtureCollectionDefinition(collectionId);
  const messages = loadNonAiShellFixtureMessages();
  const emptyStateMessages = await loadUiMessages(defaultLocale);

  return renderShellSectionCollectionIndexPage({
    definition,
    pages: listNonAiShellFixturePages(),
    messages,
    locale: defaultLocale,
    emptyStateMessages,
  });
}

export async function renderNonAiShellFixtureEmptySectionIndexPage(
  collectionId: NonAiShellFixtureCollectionId,
) {
  const definition = getNonAiShellFixtureCollectionDefinition(collectionId);
  const messages = loadNonAiShellFixtureMessages();
  const emptyStateMessages = await loadUiMessages(defaultLocale);

  return renderShellSectionCollectionIndexPage({
    definition,
    pages: [],
    messages,
    locale: defaultLocale,
    emptyStateMessages,
  });
}
