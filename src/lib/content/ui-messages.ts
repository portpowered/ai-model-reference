import type { UiMessages } from "./ui-messages.types";

export type { UiMessages } from "./ui-messages.types";
export { formatPageKind } from "./ui-messages.types";

/** Loads shell UI messages via a dynamic import so App Router routes avoid a static `node:fs` graph. */
export async function loadUiMessages(locale = "en"): Promise<UiMessages> {
  const { loadUiMessagesFromDisk } = await import("./ui-messages-load");
  return loadUiMessagesFromDisk(locale);
}
