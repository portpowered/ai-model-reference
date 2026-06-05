import { describe, expect, test } from "bun:test";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsIndexEmptyState } from "@/features/docs/components/DocsIndexEmptyState";
import { loadUiMessages } from "@/lib/content/ui-messages";
import type { UiMessages } from "@/lib/content/ui-messages.types";

function renderEmptyState(
  messages: UiMessages,
  title: string,
  description: string,
  homeLinkLabel: string,
) {
  const SearchDialog: ComponentType<SharedProps> = () => null;

  return renderToStaticMarkup(
    <RootProvider search={{ SearchDialog, enabled: true }}>
      <DocsIndexEmptyState
        title={title}
        description={description}
        homeLinkLabel={homeLinkLabel}
        messages={messages}
      />
    </RootProvider>,
  );
}

describe("DocsIndexEmptyState", () => {
  test("renders title, description, home link, and search affordance", async () => {
    const messages = await loadUiMessages();
    const html = renderEmptyState(
      messages,
      "No entries yet",
      "Try search or return home.",
      "Back to home",
    );

    expect(html).toContain("<output");
    expect(html).toContain("No entries yet");
    expect(html).toContain("Try search or return home.");
    expect(html).toContain('href="/"');
    expect(html).toContain("Back to home");
    expect(html).toContain("data-search");
    expect(html).toContain(messages.search.open);
  });
});
