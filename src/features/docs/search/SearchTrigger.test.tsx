import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  afterEach(() => {
    cleanup();
  });

  test("exposes header search affordance with aria-label and data-search", async () => {
    const messages = await loadUiMessages();
    const html = renderSearchTrigger(messages);

    expect(html).toContain('data-search=""');
    expect(html).toContain(`aria-label="${messages.search.open}"`);
    expect(html).toContain('type="button"');
    expect(html).toContain(messages.search.shortcut);
    expect(html).toContain("<kbd");
    expect(html).toContain("hidden gap-0.5 md:inline-flex");
  });

  test("keeps shortcut chips readable on trigger hover and focus via group accent styles", async () => {
    const messages = await loadUiMessages();
    const html = renderSearchTrigger(messages);

    expect(html).toContain("group ");
    expect(html).toContain("hover:border-accent");
    expect(html).toContain("group-hover:text-accent-foreground");
    expect(html).toContain("group-hover:bg-accent-foreground/10");
    expect(html).toContain("group-focus-visible:text-accent-foreground");
    expect(html).toContain("group-focus-visible:bg-accent-foreground/10");
  });

  test("merges caller layout classes so the trigger can expand in mobile header slots", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;

    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <SearchTrigger
          messages={messages}
          className="w-full justify-between md:w-auto"
        />
      </RootProvider>,
    );

    expect(html).toContain("w-full");
    expect(html).toContain("justify-between");
    expect(html).toContain("md:w-auto");
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

  test("opens search on click and toggles accent styles while hovered", async () => {
    const messages = await loadUiMessages();
    const user = userEvent.setup();
    let open = false;
    const SearchDialog: ComponentType<SharedProps> = ({ open: isOpen }) => {
      open = isOpen;
      return null;
    };

    render(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <SearchTrigger messages={messages} />
      </RootProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: messages.search.open,
    });
    expect(trigger.getAttribute("style")).toBeNull();

    await user.hover(trigger);
    expect(trigger.getAttribute("style")).toContain(
      "background-color: var(--accent)",
    );
    expect(trigger.getAttribute("style")).toContain(
      "border-color: var(--accent)",
    );
    expect(trigger.getAttribute("style")).toContain(
      "color: var(--accent-foreground)",
    );

    const hotKey = trigger.querySelector("kbd");
    expect(hotKey?.getAttribute("style")).toContain(
      "color: var(--accent-foreground)",
    );

    await user.unhover(trigger);
    expect(trigger.getAttribute("style")).toBeNull();
    expect(hotKey?.getAttribute("style")).toBeNull();

    await user.click(trigger);
    expect(open).toBe(true);
  });
});
