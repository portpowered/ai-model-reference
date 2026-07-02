import "./mock-navigation";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Callout } from "@/features/docs/components/Callout";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { Section } from "@/features/docs/components/Section";
import { T } from "@/features/docs/components/T";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { SearchResultMetaDetails } from "@/features/docs/search/SearchResultMetaDetails";
import { SearchInlineResultItem } from "@/features/docs/search/SearchResults";
import type { PageMessages } from "@/lib/content/schemas";
import {
  expectNoSeriousAxeViolations,
  expectSeriousAxeViolations,
} from "@/tests/a11y/axe";
import {
  loadCalloutExamplePageMessages,
  loadGqaPageMessages,
  renderSearchResultListItem,
  renderWithPageMessages,
} from "@/tests/a11y/docs-components-fixture";
import {
  loadAppTestContext,
  renderWithAppProviders,
} from "@/tests/a11y/render";
import { A11yTestViolation } from "@/tests/a11y/violation";
import { SAMPLE_MODULE_URL } from "@/tests/search/helpers";

describe("Callout accessibility smoke", () => {
  let messages: PageMessages;

  beforeAll(() => {
    messages = loadCalloutExamplePageMessages();
  });

  afterEach(() => {
    cleanup();
  });

  test("passes axe in default module page configuration", async () => {
    const { container } = renderWithPageMessages(
      <Callout type="note" titleKey="callouts.readerShortcut.title">
        <T k="callouts.readerShortcut.body" />
      </Callout>,
      { messages },
    );

    expect(screen.getByText("Reader Shortcut")).toBeTruthy();
    await expectNoSeriousAxeViolations(container);
  });

  test("fails axe when a deliberate serious violation is introduced", async () => {
    const { container } = renderWithPageMessages(
      <Callout type="note" titleKey="callouts.readerShortcut.title">
        <T k="callouts.readerShortcut.body" />
        <A11yTestViolation />
      </Callout>,
      { messages },
    );

    await expectSeriousAxeViolations(container);
  });
});

describe("Section accessibility smoke", () => {
  let messages: PageMessages;

  beforeAll(async () => {
    messages = await loadGqaPageMessages();
  });

  afterEach(() => {
    cleanup();
  });

  test("passes axe in default module page configuration", async () => {
    const { container } = renderWithPageMessages(
      <Section id="what-it-is" titleKey="sections.whatItIs.title">
        <T k="sections.whatItIs.body" />
      </Section>,
      { messages },
    );

    expect(screen.getByRole("heading", { name: "What It Is" })).toBeTruthy();
    await expectNoSeriousAxeViolations(container);
  });

  test("fails axe when a deliberate serious violation is introduced", async () => {
    const { container } = renderWithPageMessages(
      <Section id="what-it-is" titleKey="sections.whatItIs.title">
        <T k="sections.whatItIs.body" />
        <A11yTestViolation />
      </Section>,
      { messages },
    );

    await expectSeriousAxeViolations(container);
  });
});

describe("TagPillList accessibility smoke", () => {
  afterEach(() => {
    cleanup();
  });

  test("passes axe in default module page configuration", async () => {
    const { container } = render(
      <main>
        <TagPillList registryId="module.grouped-query-attention" />
      </main>,
    );

    expect(screen.getByRole("list", { name: "Tags" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Attention" })).toBeTruthy();
    await expectNoSeriousAxeViolations(container);
  });

  test("fails axe when a deliberate serious violation is introduced", async () => {
    const { container } = render(
      <main>
        <TagPillList registryId="module.grouped-query-attention" />
        <A11yTestViolation />
      </main>,
    );

    await expectSeriousAxeViolations(container);
  });
});

describe("DerivedRelatedDocs accessibility smoke", () => {
  afterEach(() => {
    cleanup();
  });

  test("passes axe in default module page configuration", async () => {
    const { container } = render(
      <main>
        <DerivedRelatedDocs
          registryId="module.grouped-query-attention"
          groups={["same-variant-group"]}
        />
      </main>,
    );

    expect(screen.getByTestId("derived-related-docs")).toBeTruthy();
    expect(screen.getByRole("link", { name: "attention" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show 8 more" })).toBeTruthy();
    await expectNoSeriousAxeViolations(container);
  });

  test("fails axe when a deliberate serious violation is introduced", async () => {
    const { container } = render(
      <main>
        <DerivedRelatedDocs
          registryId="module.grouped-query-attention"
          groups={["same-variant-group"]}
        />
        <A11yTestViolation />
      </main>,
    );

    await expectSeriousAxeViolations(container);
  });
});

describe("SearchResults accessibility smoke", () => {
  afterEach(() => {
    cleanup();
  });

  test("SearchInlineResultItem passes axe in default search row configuration", async () => {
    const context = await loadAppTestContext();
    const meta = context.metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const { container } = await renderWithAppProviders(
      <main>
        <SearchInlineResultItem
          item={{
            id: "page-gqa",
            type: "page",
            url: SAMPLE_MODULE_URL,
            content: "Grouped-Query Attention",
          }}
          query="GQA"
          metaByUrl={context.metaByUrl}
          messages={context.messages}
          onSelect={() => {}}
        />
      </main>,
      { context },
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Grouped-Query Attention" }),
      ).toBeTruthy();
    });
    await expectNoSeriousAxeViolations(container);
  });

  test("SearchInlineResultItem fails axe when a deliberate serious violation is introduced", async () => {
    const context = await loadAppTestContext();
    const { container } = await renderWithAppProviders(
      <main>
        <SearchInlineResultItem
          item={{
            id: "page-gqa",
            type: "page",
            url: SAMPLE_MODULE_URL,
            content: "Grouped-Query Attention",
          }}
          query="GQA"
          metaByUrl={context.metaByUrl}
          messages={context.messages}
          onSelect={() => {}}
        />
        <A11yTestViolation />
      </main>,
      { context },
    );

    await expectSeriousAxeViolations(container);
  });

  test("SearchResultMetaDetails passes axe in default search row configuration", async () => {
    const context = await loadAppTestContext();
    const meta = context.metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const { container } = render(
      <SearchResultMetaDetails
        url={SAMPLE_MODULE_URL}
        meta={meta}
        messages={context.messages}
      />,
    );

    expect(screen.getByTestId("search-result-meta")).toBeTruthy();
    await expectNoSeriousAxeViolations(container);
  });

  test("SearchResultMetaDetails fails axe when a deliberate serious violation is introduced", async () => {
    const context = await loadAppTestContext();
    const meta = context.metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const { container } = render(
      <main>
        <SearchResultMetaDetails
          url={SAMPLE_MODULE_URL}
          meta={meta}
          messages={context.messages}
        />
        <A11yTestViolation />
      </main>,
    );

    await expectSeriousAxeViolations(container);
  });

  test("SearchResultListItem passes axe for Model Atlas metadata in dialog row configuration", async () => {
    const context = await loadAppTestContext();
    const item = {
      id: "page-gqa",
      type: "page" as const,
      url: SAMPLE_MODULE_URL,
      content: "Grouped-Query Attention",
    };
    const { container } = await renderSearchResultListItem({
      item,
      query: "GQA",
      context,
    });

    expect(
      screen.getByRole("button", { name: "Grouped-Query Attention" }),
    ).toBeTruthy();
    const meta = screen.getByTestId("search-result-meta");
    expect(
      container.querySelector('[data-testid="search-result-meta"]'),
    ).toBeTruthy();
    await expectNoSeriousAxeViolations(meta);
  });

  test("SearchResultListItem fails axe when a deliberate serious violation is introduced", async () => {
    const context = await loadAppTestContext();
    const item = {
      id: "page-gqa",
      type: "page" as const,
      url: SAMPLE_MODULE_URL,
      content: "Grouped-Query Attention",
    };
    const { container } = await renderSearchResultListItem({
      item,
      query: "GQA",
      context,
      violation: <A11yTestViolation />,
    });

    await expectSeriousAxeViolations(container);
  });
});
