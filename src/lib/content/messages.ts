import { readFileSync } from "node:fs";
import path from "node:path";
import { type PageMessages, pageMessagesSchema } from "./schemas";

export function loadPageMessages(
  pageDir: string,
  locale: string,
): PageMessages {
  const filePath = path.join(pageDir, "messages", `${locale}.json`);
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  return pageMessagesSchema.parse(raw);
}

export function collectMessageBodyText(messages: PageMessages): string {
  const parts: string[] = [
    messages.title,
    messages.description,
    messages.problemStatement ?? "",
    messages.coreIdea ?? "",
  ];

  if (messages.sections) {
    for (const section of Object.values(messages.sections)) {
      parts.push(section.title, section.body ?? "");
    }
  }

  if (messages.callouts) {
    for (const callout of Object.values(messages.callouts)) {
      parts.push(callout.title ?? "", callout.body);
    }
  }

  if (messages.assets) {
    for (const asset of Object.values(messages.assets)) {
      parts.push(asset.alt ?? "", asset.caption ?? "");
    }
  }

  return parts.filter(Boolean).join("\n");
}

export function collectMessageHeadings(messages: PageMessages): string[] {
  const headings = [messages.title];
  if (messages.sections) {
    for (const section of Object.values(messages.sections)) {
      headings.push(section.title);
    }
  }
  return headings;
}
