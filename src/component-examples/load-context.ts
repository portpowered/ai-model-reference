import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentExampleContext } from "@/component-examples/types";
import { getProjectRoot } from "@/lib/content/content-paths";
import { modulePageHref } from "@/lib/content/content-hrefs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";

const messageFixture = JSON.parse(
  readFileSync(
    join(
      getProjectRoot(),
      "src",
      "lib",
      "content",
      "__fixtures__",
      "page-messages.json",
    ),
    "utf8",
  ),
);

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
