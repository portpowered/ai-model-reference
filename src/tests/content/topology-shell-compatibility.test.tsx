import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { cleanup, screen, within } from "@testing-library/react";
import { act } from "react";
import {
  renderBrowseIndexPage,
  renderGlossaryIndexPage,
} from "@/app/(site)/site-renderers";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { PLACEHOLDER_SIDEBAR_DESCRIPTION } from "@/lib/navigation/docs-sidebar-contract";
import { assertDocsShellConvergence } from "@/lib/verify/docs-shell-convergence";
import { httpGetText } from "@/lib/verify/http-harness";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";

const repoRoot = join(import.meta.dir, "../../..");
const ACTIVATION_GRAPH_MAP_PATH =
  "/browse?classification=activation-functions&mode=graph-map";

describe("topology browse shell compatibility", () => {
  beforeAll(() => {
    captureOriginalFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
  });

  test("topology prototype route keeps legacy docs shell navigation available", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    const page = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "activation-functions",
        mode: "graph-map",
      }),
    });

    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages}>
          {page}
        </CanonicalDocsLayout>,
        { context },
      );
    });

    expect(
      screen.getByRole("heading", { name: "Activation Functions Graph Map" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: context.messages.search.open }),
    ).toBeTruthy();

    const primaryNav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of [
      context.messages.nav.architecture,
      context.messages.nav.glossary,
      context.messages.nav.tags,
    ] as const) {
      expect(
        within(primaryNav).getByRole("link", { name: label }),
      ).toBeTruthy();
    }

    const sidebar = document.getElementById("nd-sidebar");
    expect(sidebar).toBeTruthy();
    if (!sidebar) {
      throw new Error("expected Fumadocs sidebar");
    }

    expect(within(sidebar).getByText("Modules")).toBeTruthy();
    expect(within(sidebar).getByText("Glossary")).toBeTruthy();
    expect(document.body.textContent).not.toContain(
      PLACEHOLDER_SIDEBAR_DESCRIPTION,
    );
  });

  test("normal glossary pages still expose topology entry points in the shared header", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    const page = await renderGlossaryIndexPage();

    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages}>
          {page}
        </CanonicalDocsLayout>,
        { context },
      );
    });

    expect(screen.getByRole("heading", { name: "Glossary" })).toBeTruthy();

    const primaryNav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(primaryNav).getByRole("link", {
        name: "Activation Functions Graph Map",
      }),
    ).toBeTruthy();
    expect(
      within(primaryNav).getByRole("link", {
        name: "Feed Forward Networks Timeline",
      }),
    ).toBeTruthy();

    const sidebar = document.getElementById("nd-sidebar");
    expect(sidebar).toBeTruthy();
    if (!sidebar) {
      throw new Error("expected Fumadocs sidebar");
    }

    expect(within(sidebar).getByText("Modules")).toBeTruthy();
    expect(within(sidebar).getByText("Glossary")).toBeTruthy();
  });

  test("served production routes keep both legacy and prototype navigation paths usable", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    try {
      const legacyRoute = await httpGetText(
        `${session.baseUrl}/docs/glossary/token`,
      );
      expect(legacyRoute.status).toBe(200);
      expect(assertDocsShellConvergence(legacyRoute.body)).toBeNull();
      expect(legacyRoute.body).toContain(
        'href="/browse?classification=activation-functions&amp;mode=graph-map"',
      );
      expect(legacyRoute.body).toContain(
        'href="/browse?classification=feed-forward-networks&amp;mode=timeline"',
      );

      const topologyRoute = await httpGetText(
        `${session.baseUrl}${ACTIVATION_GRAPH_MAP_PATH}`,
      );
      expect(topologyRoute.status).toBe(200);
      expect(assertDocsShellConvergence(topologyRoute.body)).toBeNull();
      expect(topologyRoute.body).toContain('href="/docs/architecture"');
      expect(topologyRoute.body).toContain('href="/docs/glossary"');
      expect(topologyRoute.body).toContain('href="/tags"');
      expect(topologyRoute.body).toContain('data-search=""');
      expect(topologyRoute.body).toContain('href="/docs/glossary/token"');
    } finally {
      await session.cleanup();
    }
  }, 60_000);
});
