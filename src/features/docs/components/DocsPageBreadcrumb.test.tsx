import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsPageBreadcrumb } from "@/features/docs/components/DocsPageBreadcrumb";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("DocsPageBreadcrumb", () => {
  test("renders clickable home and section links for nested docs pages", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(
      <DocsPageBreadcrumb
        messages={messages}
        slug={["modules", "relu"]}
        title="ReLU"
      />,
    );

    expect(html).toContain('aria-label="breadcrumb"');
    expect(html).toContain('href="/"');
    expect(html).toContain(">Home<");
    expect(html).toContain('href="/docs/modules"');
    expect(html).toContain(">Modules<");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(">ReLU<");
  });

  test("renders only the home link and current page for top-level docs pages", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(
      <DocsPageBreadcrumb
        messages={messages}
        slug={["getting-started"]}
        title="Getting Started"
      />,
    );

    expect(html).toContain('href="/"');
    expect(html).toContain(">Home<");
    expect(html).not.toContain('href="/docs/getting-started"');
    expect(html).toContain(">Getting Started<");
  });
});
