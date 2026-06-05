import { describe, expect, test } from "bun:test";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchTrigger } from "@/features/docs/search/SearchTrigger";
import { loadUiMessages } from "@/lib/content/ui-messages";
import type { UiMessages } from "@/lib/content/ui-messages.types";

function renderSearchTrigger(messages: UiMessages) {
  const SearchDialog: ComponentType<SharedProps> = () => null;

  return renderToStaticMarkup(
    <RootProvider search={{ SearchDialog, enabled: true }}>
      <SearchTrigger messages={messages} />
    </RootProvider>,
  );
}

describe("SearchTrigger", () => {
  test("exposes header search affordance with aria-label and data-search", async () => {
    const messages = await loadUiMessages();
    const html = renderSearchTrigger(messages);

    expect(html).toContain('data-search=""');
    expect(html).toContain(`aria-label="${messages.search.open}"`);
    expect(html).toContain('type="button"');
    expect(html).toContain(messages.search.shortcut);
    expect(html).toContain("<kbd");
  });

  test("keeps shortcut chips readable on trigger hover and focus via group accent styles", async () => {
    const messages = await loadUiMessages();
    const html = renderSearchTrigger(messages);

    expect(html).toContain("group ");
    expect(html).toContain("group-hover:text-accent-foreground");
    expect(html).toContain("group-hover:bg-accent-foreground/10");
    expect(html).toContain("group-focus-visible:text-accent-foreground");
    expect(html).toContain("group-focus-visible:bg-accent-foreground/10");
  });

  test("omits the trigger when search is disabled and hideIfDisabled is set", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;

    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: false }}>
        <SearchTrigger messages={messages} hideIfDisabled />
      </RootProvider>,
    );

    expect(html).not.toContain('data-search=""');
    expect(html).not.toContain('type="button"');
  });
});
