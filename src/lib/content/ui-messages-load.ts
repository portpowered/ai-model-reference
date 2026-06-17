import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { MESSAGES_ROOT } from "./content-paths";
import type { UiMessages } from "./ui-messages.types";

function uiMessagesPath(locale: SiteLocale): string {
  return join(MESSAGES_ROOT, locale, "common.json");
}

function readUiMessagesFile(locale: SiteLocale): UiMessages {
  return JSON.parse(readFileSync(uiMessagesPath(locale), "utf8")) as UiMessages;
}

export function loadUiMessagesFromDisk(
  locale: SiteLocale = defaultLocale,
): UiMessages {
  try {
    return readUiMessagesFile(locale);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;

    if (locale !== defaultLocale && code === "ENOENT") {
      return readUiMessagesFile(defaultLocale);
    }

    throw error;
  }
}
