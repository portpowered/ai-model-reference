import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Callout } from "@/features/docs/components/Callout";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import type { PageMessages } from "@/lib/content/schemas";

const messages = JSON.parse(
  readFileSync(
    join(
      import.meta.dir,
      "../../../lib/content/__fixtures__/page-messages.json",
    ),
    "utf8",
  ),
) as PageMessages;

function renderCallout(
  titleKey: string,
  isDev: boolean,
  type: "note" | "warning" = "note",
) {
  return renderToStaticMarkup(
    <PageMessagesProvider messages={messages} isDev={isDev}>
      <Callout type={type} titleKey={titleKey}>
        <span>Body copy</span>
      </Callout>
    </PageMessagesProvider>,
  );
}

describe("Callout", () => {
  test("renders resolved title and body for a valid titleKey", () => {
    const html = renderCallout("callouts.readerShortcut.title", false);
    expect(html).toContain('data-callout-type="note"');
    expect(html).toContain("Reader Shortcut");
    expect(html).toContain("Body copy");
  });

  test("shows a developer-visible title error in development when titleKey is missing", () => {
    const html = renderCallout("callouts.missing.title", true);
    expect(html).toContain("Missing message key: callouts.missing.title");
  });

  test("renders body without a title outside development when titleKey is missing", () => {
    const html = renderCallout("callouts.missing.title", false);
    expect(html).not.toContain("Missing message key");
    expect(html).toContain("Body copy");
  });

  test("sets data-callout-type for warning callouts", () => {
    const html = renderCallout(
      "callouts.readerShortcut.title",
      false,
      "warning",
    );
    expect(html).toContain('data-callout-type="warning"');
  });

  test("uses balanced vertical padding and flex gap between title and body", () => {
    const html = renderCallout("callouts.readerShortcut.title", false);

    expect(html).toContain("px-4 py-3.5");
    expect(html).toContain("flex flex-col gap-2");
    expect(html).not.toContain("p-4");
    expect(html).not.toContain("mb-2");
  });
});
