import type { ComponentExampleContext } from "@/component-examples/types";
import { modulePageHref } from "@/lib/content/content-hrefs";
import {
  groupedQueryAttentionPageDir,
  loadPageMessages,
} from "@/lib/content/page-messages-load";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";

export async function loadComponentExampleContext(): Promise<ComponentExampleContext> {
  const [pageMessages, uiMessages, metaMap] = await Promise.all([
    loadPageMessages(groupedQueryAttentionPageDir, "en"),
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
