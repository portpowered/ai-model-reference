import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";

import { HomeArticle } from "@/components/home/home-article";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildHomeTableOfContents } from "@/lib/navigation/home-page-toc";

export default async function HomePage() {
  const messages = await loadUiMessages();
  const { home } = messages;

  return (
    <DocsPage
      toc={buildHomeTableOfContents(home)}
      breadcrumb={{ enabled: false }}
      footer={{ enabled: false }}
    >
      <DocsBody>
        <HomeArticle messages={messages} />
      </DocsBody>
    </DocsPage>
  );
}
