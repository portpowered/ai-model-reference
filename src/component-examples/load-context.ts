import type { ComponentExampleContext } from "@/component-examples/types";
import messageFixture from "@/lib/content/__fixtures__/page-messages.json";
import { modulePageHref } from "@/lib/content/content-hrefs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";

export async function loadComponentExampleContext(): Promise<ComponentExampleContext> {
  const [pageMessages, uiMessages, metaMap] = await Promise.all([
    Promise.resolve(pageMessagesSchema.parse(messageFixture)),
    loadUiMessages(),
    loadSearchResultMetaMap(),
  ]);

  return {
    pageMessages,
    uiMessages,
    metaByUrl: searchResultMetaMapToRecord(metaMap),
    sampleModuleUrl: modulePageHref("grouped-query-attention"),
  };
}
