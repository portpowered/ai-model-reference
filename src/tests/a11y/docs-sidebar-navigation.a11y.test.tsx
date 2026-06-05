import "./mock-navigation";
import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { cleanup, within } from "@testing-library/react";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import {
  GROUPED_QUERY_ATTENTION_URL,
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";

describe("docs sidebar navigation accessibility", () => {
  afterEach(() => {
    cleanup();
    restoreFetchMock();
  });

  test("CanonicalDocsLayout exposes keyboard-reachable Token and GQA sidebar links", async () => {
    captureOriginalFetch();
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();

    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages}>
          <p>Fixture article</p>
        </CanonicalDocsLayout>,
        { context },
      );
    });

    const sidebar = document.getElementById("nd-sidebar");
    expect(sidebar).toBeTruthy();
    if (!sidebar) {
      throw new Error("expected Fumadocs docs sidebar");
    }

    expect(sidebar.getAttribute("aria-label")).toBe(
      context.messages.shell.sidebarTitle,
    );
    expect(within(sidebar).queryByText(PLACEHOLDER_SIDEBAR_DESCRIPTION)).toBe(
      null,
    );

    const glossaryFolder = within(sidebar).getByRole("button", {
      name: "Glossary",
    });
    await act(async () => {
      glossaryFolder.click();
    });

    const modulesFolder = within(sidebar).getByRole("button", {
      name: "Modules",
    });
    await act(async () => {
      modulesFolder.click();
    });

    const tokenLink = within(sidebar).getByRole("link", { name: "Token" });
    expect(tokenLink.getAttribute("href")).toBe(TOKEN_GLOSSARY_URL);
    tokenLink.focus();
    expect(document.activeElement).toBe(tokenLink);

    const gqaLink = within(sidebar).getByRole("link", {
      name: "Grouped-Query Attention",
    });
    expect(gqaLink.getAttribute("href")).toBe(GROUPED_QUERY_ATTENTION_URL);
    gqaLink.focus();
    expect(document.activeElement).toBe(gqaLink);
  });
});
