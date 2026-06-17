import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { MESSAGES_ROOT } from "./content-paths";
import type { UiMessages } from "./ui-messages.types";

export type UiMessagesLoadErrorDetail =
  | { type: "missing-file"; path: string; locale: SiteLocale }
  | { type: "parse-error"; path: string; locale: SiteLocale; message: string };

export class UiMessagesLoadError extends Error {
  readonly details: UiMessagesLoadErrorDetail[];

  constructor(message: string, details: UiMessagesLoadErrorDetail[]) {
    super(message);
    this.name = "UiMessagesLoadError";
    this.details = details;
  }
}

type UiMessagesLoadOptions = {
  messagesRoot?: string;
};

function uiMessagesPath(
  locale: SiteLocale,
  messagesRoot: string = MESSAGES_ROOT,
): string {
  return join(messagesRoot, locale, "common.json");
}

function readUiMessagesFile(
  locale: SiteLocale,
  options: UiMessagesLoadOptions = {},
): UiMessages {
  const path = uiMessagesPath(locale, options.messagesRoot);

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      const defaultLocaleLabel = locale === defaultLocale ? " default" : "";
      throw new UiMessagesLoadError(
        `Missing required${defaultLocaleLabel} UI messages file for locale "${locale}": ${path}`,
        [{ type: "missing-file", path, locale }],
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new UiMessagesLoadError(`Failed to read UI messages file: ${path}`, [
      { type: "parse-error", path, locale, message },
    ]);
  }

  try {
    return JSON.parse(raw) as UiMessages;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new UiMessagesLoadError(`Invalid JSON in UI messages file: ${path}`, [
      { type: "parse-error", path, locale, message },
    ]);
  }
}

export function loadUiMessagesFromDisk(
  locale: SiteLocale = defaultLocale,
  options: UiMessagesLoadOptions = {},
): UiMessages {
  return readUiMessagesFile(locale, options);
}
