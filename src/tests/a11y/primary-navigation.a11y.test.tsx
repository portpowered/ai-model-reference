import "./mock-navigation";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, screen, within } from "@testing-library/react";
import { act } from "react";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import { expectNoSeriousAxeViolations } from "@/tests/a11y/axe";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";

describe("primary navigation accessibility smoke", () => {
  beforeAll(() => {
    captureOriginalFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
  });

  test("exposes nav landmark, accessible link names, keyboard focus, and no serious axe violations", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages}>
          <p>Fixture page content</p>
        </CanonicalDocsLayout>,
        { context },
      );
    });

    const header = document.querySelector("header");
    expect(header).toBeTruthy();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeTruthy();

    const searchTrigger = header?.querySelector("[data-search]");
    expect(searchTrigger).toBeTruthy();

    const expectedItems = getPrimaryNavItems(context.messages);
    for (const item of expectedItems) {
      const link = within(nav).getByRole("link", { name: item.label });
      expect(link.getAttribute("href")).toBe(item.href);
    }

    for (const item of expectedItems) {
      const link = within(nav).getByRole("link", { name: item.label });
      link.focus();
      expect(document.activeElement).toBe(link);
    }

    await expectNoSeriousAxeViolations(header ?? document.body);
  });
});
