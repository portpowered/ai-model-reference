import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { UiMessages } from "@/lib/content/ui-messages.types";

export type { UiMessages } from "@/lib/content/ui-messages.types";

const MESSAGES_ROOT = join(process.cwd(), "src/content/messages");

export function loadUiMessages(locale = "en"): UiMessages {
  const path = join(MESSAGES_ROOT, locale, "common.json");
  return JSON.parse(readFileSync(path, "utf8")) as UiMessages;
}
