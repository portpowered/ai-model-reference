import "./mock-navigation";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, screen, within } from "@testing-library/react";
import { DocsShell } from "@/components/layout/docs-shell";
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
    const { container } = await renderWithAppProviders(
      <DocsShell messages={context.messages}>
        <p>Fixture page content</p>
      </DocsShell>,
      { context },
    );

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeTruthy();

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

    await expectNoSeriousAxeViolations(container);
  });
});
