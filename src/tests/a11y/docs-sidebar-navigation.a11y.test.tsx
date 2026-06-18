import "./mock-navigation";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, within } from "@testing-library/react";
import { act } from "react";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  GROUPED_QUERY_ATTENTION_URL,
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
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
    expect(within(sidebar).queryByLabelText("Toggle Theme")).toBe(null);
    expect(sidebar.querySelector("[data-theme-toggle]")).toBe(null);

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

  test("localized docs shell preserves locale while exposing only shipped Vietnamese docs links", async () => {
    captureOriginalFetch();
    await installDocsSearchFetchMock();
    const [messages, metaMap] = await Promise.all([
      loadUiMessages("vi"),
      loadSearchResultMetaMap("vi"),
    ]);
    const context = {
      messages,
      metaByUrl: searchResultMetaMapToRecord(metaMap),
    };

    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages} locale="vi">
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

    const homeLink = within(sidebar).getByRole("link", {
      name: "Model Atlas",
    });
    expect(homeLink.getAttribute("href")).toBe("/vi");

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
    expect(tokenLink.getAttribute("href")).toBe("/vi/docs/glossary/token");

    const gqaLink = within(sidebar).getByRole("link", {
      name: "Grouped-Query Attention",
    });
    expect(gqaLink.getAttribute("href")).toBe(
      "/vi/docs/modules/grouped-query-attention",
    );

    const multiHeadLink = within(sidebar).getByRole("link", {
      name: "Multi-Head Attention",
    });
    expect(multiHeadLink.getAttribute("href")).toBe(
      "/vi/docs/modules/multi-head-attention",
    );

    const linearAttentionLink = within(sidebar).getByRole("link", {
      name: "Linear Attention",
    });
    expect(linearAttentionLink.getAttribute("href")).toBe(
      "/vi/docs/modules/linear-attention",
    );

    expect(
      within(sidebar).queryByRole("link", { name: "Getting started" }),
    ).toBeNull();
    expect(
      within(sidebar).queryByRole("link", {
        name: "Multi-Head Latent Attention",
      }),
    ).toBeNull();
    expect(
      within(sidebar).queryByRole("link", { name: "Sparse Attention" }),
    ).toBeNull();
  });
});
