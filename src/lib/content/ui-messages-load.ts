import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { MESSAGES_ROOT } from "./content-paths";
import type { UiMessages } from "./ui-messages.types";

export function loadUiMessagesFromDisk(
  locale: SiteLocale = defaultLocale,
): UiMessages {
  const path = join(MESSAGES_ROOT, locale, "common.json");
  return JSON.parse(readFileSync(path, "utf8")) as UiMessages;
}
