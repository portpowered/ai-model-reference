import "./mock-navigation";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import type { LoadedLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { expectNoSeriousAxeViolations } from "@/tests/a11y/axe";

describe("token glossary route accessibility smoke", () => {
  let loadedPage: LoadedLocalDocsPage;

  beforeAll(async () => {
    loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("passes axe for converged token glossary article body", async () => {
    const { container } = render(
      <main>
        <ModulePageProviders
          messages={loadedPage.messages}
          assets={loadedPage.assets}
        >
          {loadedPage.content}
        </ModulePageProviders>
      </main>,
    );

    expect(screen.getByTestId("glossary-opening")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Tags" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Attention" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Token To Probability Chain" }),
    ).toBeTruthy();
    await expectNoSeriousAxeViolations(container);
  });
});
