import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type PageMessages, pageMessagesSchema } from "./schemas";

export type MessageLoadErrorDetail =
  | { type: "missing-file"; path: string; locale: string }
  | { type: "parse-error"; path: string; message: string };

export class MessageLoadError extends Error {
  readonly details: MessageLoadErrorDetail[];

  constructor(message: string, details: MessageLoadErrorDetail[]) {
    super(message);
    this.name = "MessageLoadError";
    this.details = details;
  }
}

export const groupedQueryAttentionPageDir = join(
  import.meta.dir,
  "../../content/docs/modules/grouped-query-attention",
);

function messagesFilePath(pageDirectory: string, locale: string): string {
  return join(pageDirectory, "messages", `${locale}.json`);
}

export async function loadPageMessages(
  pageDirectory: string,
  locale: string,
): Promise<PageMessages> {
  const path = messagesFilePath(pageDirectory, locale);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      const message =
        locale === "en"
          ? `Missing required default locale messages file: ${path}`
          : `Missing messages file for locale "${locale}": ${path}`;
      throw new MessageLoadError(message, [
        { type: "missing-file", path, locale },
      ]);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new MessageLoadError(`Failed to read messages file ${path}`, [
      { type: "parse-error", path, message },
    ]);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new MessageLoadError(`Invalid JSON in messages file ${path}`, [
      { type: "parse-error", path, message },
    ]);
  }

  const result = pageMessagesSchema.safeParse(json);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new MessageLoadError(
      `Page messages schema validation failed for ${path}`,
      [{ type: "parse-error", path, message }],
    );
  }

  return result.data;
}
