import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import type { UiMessages } from "./ui-messages.types";

export type {
  AiCollectionIndexMessages,
  AiDomainMessages,
  AiTagMessages,
  BrowseIndexMessages,
  DocsMessages,
  HomeMessages,
  LanguageMessages,
  NavMessages,
  SearchEntryMessages,
  SearchMessages,
  SectionIndexMessages,
  ShellLayoutMessages,
  ShellMessages,
  TagLandingMessages,
  TagsIndexMessages,
  TimelinePageMessages,
  TopologyBrowseClassificationLabels,
  TopologyBrowseMessages,
  TopologyPrototypeMessages,
  UiMessages,
} from "./ui-messages.types";
export { formatPageKind } from "./ui-messages.types";

/** Loads shell UI messages via a dynamic import so App Router routes avoid a static `node:fs` graph. */
export async function loadUiMessages(
  locale: SiteLocale = defaultLocale,
): Promise<UiMessages> {
  const { loadUiMessagesFromDisk } = await import("./ui-messages-load");
  return loadUiMessagesFromDisk(locale);
}
